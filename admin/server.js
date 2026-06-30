/**
 * LinX Admin Dashboard — Backend Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Run with : node server.js  (or: npm start)
 * Dev mode : npm run dev     (requires nodemon)
 *
 * Requires : Node.js 18+, all .env variables set (copy .env.example → .env)
 *
 * Google Sheets setup
 * ───────────────────
 * 1. Go to console.cloud.google.com and create (or select) a project.
 * 2. Enable the "Google Sheets API" for that project.
 * 3. Create a Service Account under IAM & Admin → Service Accounts.
 * 4. Generate a JSON key for that service account and download it.
 * 5. Copy the "client_email" value → GOOGLE_SERVICE_ACCOUNT_EMAIL in .env
 * 6. Copy the "private_key" value  → GOOGLE_PRIVATE_KEY in .env
 *    (keep the surrounding quotes; \n characters represent real newlines)
 * 7. Open each Google Sheet, click Share, and give the service account email
 *    Editor access — otherwise the API calls will return 403.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── 1. IMPORTS & CONFIG ─────────────────────────────────────────────────────

require('dotenv').config();

const express      = require('express');
const jwt          = require('jsonwebtoken');
const bcrypt       = require('bcryptjs');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const { google }   = require('googleapis');

// Lead system modules
const leadStore    = require('./leads/store');
const { processLead, processBatch } = require('./leads/pipeline');
const crawler      = require('./leads/crawler');
const { classifyLead, getCategories } = require('./leads/classifier');
const { filterLeadsForContractor }    = require('./leads/geo-filter');

const app  = express();
const PORT = process.env.PORT || 3000;

// Validate critical env vars at startup so failures are obvious immediately.
const REQUIRED_ENV = ['ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH', 'JWT_SECRET'];
const missingEnv   = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missingEnv.length) {
  console.error(`[STARTUP ERROR] Missing required environment variables: ${missingEnv.join(', ')}`);
  console.error('Copy .env.example → .env and fill in all values.');
  process.exit(1);
}

// ─── 2. GOOGLE SHEETS AUTH ───────────────────────────────────────────────────

/**
 * Build an authenticated Google Sheets client using a Service Account.
 * GOOGLE_PRIVATE_KEY may arrive with literal \n characters (from .env files);
 * replace them with real newline characters before passing to the auth client.
 */
const googleAuth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheetsClient = google.sheets({ version: 'v4', auth: googleAuth });

// ─── 3. EXPRESS APP SETUP ────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    // Allow both the local dev HTML file and a local dev server on :3000.
    origin: (origin, callback) => {
      const allowed = [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:5173', // Vite dev server
          'http://127.0.0.1:5173',
          'http://localhost:5500', // common Live Server port
          'http://127.0.0.1:5500',
        ];
      // origin is undefined when the request comes from a file:// URL or
      // same-origin — allow it so the local HTML dashboard works.
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} is not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

// ── IP Whitelist Middleware ──
// If IP_WHITELIST is set (comma-separated), only those IPs may reach the server.
// Leave IP_WHITELIST empty or unset to allow all IPs.
app.use((req, res, next) => {
  const whitelist = (process.env.IP_WHITELIST || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (whitelist.length === 0) {
    return next(); // whitelist disabled — allow everyone
  }

  const clientIp = req.ip || req.connection.remoteAddress || '';
  // Normalise IPv6-mapped IPv4 addresses (::ffff:127.0.0.1 → 127.0.0.1)
  const normalised = clientIp.replace(/^::ffff:/, '');

  if (whitelist.includes(normalised) || whitelist.includes(clientIp)) {
    return next();
  }

  console.warn(`[IP BLOCKED] ${new Date().toISOString()} IP:${clientIp}`);
  return res.status(403).json({ error: 'Forbidden: IP not whitelisted' });
});

// ─── 4. RATE LIMITING ────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs        : 15 * 60 * 1000, // 15 minutes
  max             : 5,
  standardHeaders : true,
  legacyHeaders   : false,
  handler         : (req, res, _next, options) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    res.status(429).json({ error: 'Too many login attempts', retryAfter });
  },
});

const apiLimiter = rateLimit({
  windowMs        : 15 * 60 * 1000,
  max             : 200,
  standardHeaders : true,
  legacyHeaders   : false,
  message         : { error: 'Too many requests, please try again later.' },
});

app.use('/api', apiLimiter);

// ─── 5. AUTH MIDDLEWARE ───────────────────────────────────────────────────────

/**
 * verifyToken — Express middleware.
 * Extracts the Bearer token from the Authorization header, verifies it with
 * JWT_SECRET, and attaches the decoded payload to req.admin.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token      = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// ─── 6. AUTH ROUTES ───────────────────────────────────────────────────────────

// POST /api/auth/login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const usernameMatch = username === process.env.ADMIN_USERNAME;
  let passwordMatch   = false;

  if (usernameMatch) {
    try {
      passwordMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
    } catch (_err) {
      passwordMatch = false;
    }
  }

  if (!usernameMatch || !passwordMatch) {
    console.error(
      `[AUTH FAIL] ${new Date().toISOString()} IP:${req.ip} user:${username}`
    );
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: username, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );

  return res.json({ token, expiresIn: 1800 });
});

// POST /api/auth/logout
app.post('/api/auth/logout', verifyToken, (req, res) => {
  // For production, maintain a Redis token blocklist and check it in verifyToken.
  // On each request in verifyToken, look up the token's jti (JWT ID) in Redis;
  // if present, reject with 401. Add the jti here with a TTL equal to the
  // token's remaining lifetime so Redis auto-expires old entries.
  console.log(
    `[LOGOUT] ${new Date().toISOString()} admin:${req.admin.sub}`
  );
  return res.json({ success: true });
});

// POST /api/auth/refresh
app.post('/api/auth/refresh', verifyToken, (req, res) => {
  const token = jwt.sign(
    { sub: req.admin.sub, role: req.admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
  return res.json({ token, expiresIn: 1800 });
});

// ─── 7. STATS ROUTE ───────────────────────────────────────────────────────────

// GET /api/stats
app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const [homeownerRes, contractorRes] = await Promise.all([
      sheetsClient.spreadsheets.values.get({
        spreadsheetId : process.env.HOMEOWNER_SHEET_ID,
        range         : 'Sheet1!A:Z',
      }),
      sheetsClient.spreadsheets.values.get({
        spreadsheetId : process.env.CONTRACTOR_SHEET_ID,
        range         : 'Sheet1!A:Z',
      }),
    ]);

    const homeownerRows   = homeownerRes.data.values   || [];
    const contractorRows  = contractorRes.data.values  || [];

    // Row 0 is always the header row — exclude it from counts.
    const homeownerData   = homeownerRows.slice(1);
    const contractorData  = contractorRows.slice(1);

    const homeownerHeaders  = homeownerRows[0]  || [];
    const contractorHeaders = contractorRows[0] || [];

    const homeownerStatusIdx  = homeownerHeaders.findIndex(
      (h) => h.toLowerCase() === 'status'
    );
    const contractorStatusIdx = contractorHeaders.findIndex(
      (h) => h.toLowerCase() === 'status'
    );
    const homeownerDateIdx    = homeownerHeaders.findIndex(
      (h) => h.toLowerCase().includes('date') || h.toLowerCase().includes('submission')
    );
    const contractorDateIdx   = contractorHeaders.findIndex(
      (h) => h.toLowerCase().includes('date') || h.toLowerCase().includes('submission')
    );

    const pendingApprovals = contractorData.filter(
      (row) => (row[contractorStatusIdx] || '').trim() === 'Under Review'
    ).length;

    const activeJobs = homeownerData.filter(
      (row) => (row[homeownerStatusIdx] || '').trim() === 'In Progress'
    ).length;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const isRecentRow = (row, dateIdx) => {
      if (dateIdx < 0) return false;
      const raw = row[dateIdx] || '';
      if (!raw) return false;
      const ts = Date.parse(raw);
      return !isNaN(ts) && ts >= oneWeekAgo;
    };

    const newLeadsThisWeek =
      homeownerData.filter((r) => isRecentRow(r, homeownerDateIdx)).length +
      contractorData.filter((r) => isRecentRow(r, contractorDateIdx)).length;

    return res.json({
      totalHomeowners  : homeownerData.length,
      totalContractors : contractorData.length,
      pendingApprovals,
      activeJobs,
      newLeadsThisWeek,
      mrr              : 1247, // placeholder — replace with real billing data
    });
  } catch (err) {
    console.error('[/api/stats]', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── 8. ACTIVITY FEED ROUTE ───────────────────────────────────────────────────

// GET /api/activity
app.get('/api/activity', verifyToken, async (req, res) => {
  try {
    const [homeownerRes, contractorRes] = await Promise.all([
      sheetsClient.spreadsheets.values.get({
        spreadsheetId : process.env.HOMEOWNER_SHEET_ID,
        range         : 'Sheet1!A:Z',
      }),
      sheetsClient.spreadsheets.values.get({
        spreadsheetId : process.env.CONTRACTOR_SHEET_ID,
        range         : 'Sheet1!A:Z',
      }),
    ]);

    const homeownerRows  = homeownerRes.data.values  || [];
    const contractorRows = contractorRes.data.values || [];

    const homeownerHeaders  = homeownerRows[0]  || [];
    const contractorHeaders = contractorRows[0] || [];

    const hNameIdx  = homeownerHeaders.findIndex((h) => h.toLowerCase() === 'name');
    const hEmailIdx = homeownerHeaders.findIndex((h) => h.toLowerCase() === 'email');
    const hDateIdx  = homeownerHeaders.findIndex(
      (h) => h.toLowerCase().includes('date') || h.toLowerCase().includes('submission')
    );
    const hStatusIdx = homeownerHeaders.findIndex((h) => h.toLowerCase() === 'status');

    const cNameIdx  = contractorHeaders.findIndex((h) => h.toLowerCase() === 'name');
    const cEmailIdx = contractorHeaders.findIndex((h) => h.toLowerCase() === 'email');
    const cDateIdx  = contractorHeaders.findIndex(
      (h) => h.toLowerCase().includes('date') || h.toLowerCase().includes('submission')
    );

    const homeownerActivity = homeownerRows.slice(1).map((row, i) => ({
      id          : `h-${i + 1}`,
      name        : row[hNameIdx]  || 'Unknown',
      email       : row[hEmailIdx] || '',
      type        : 'new_homeowner',
      description : `New homeowner submitted a service request (status: ${row[hStatusIdx] || 'N/A'})`,
      timestamp   : row[hDateIdx]  || '',
    }));

    const contractorActivity = contractorRows.slice(1).map((row, i) => ({
      id          : `c-${i + 1}`,
      name        : row[cNameIdx]  || 'Unknown',
      email       : row[cEmailIdx] || '',
      type        : 'new_contractor',
      description : 'New contractor registration submitted',
      timestamp   : row[cDateIdx]  || '',
    }));

    const combined = [...homeownerActivity, ...contractorActivity]
      .sort((a, b) => {
        const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
        const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
        return tb - ta; // descending
      })
      .slice(0, 20);

    return res.json(combined);
  } catch (err) {
    console.error('[/api/activity]', err.message);
    return res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ─── 9. NOTIFICATIONS ROUTE ───────────────────────────────────────────────────

// GET /api/notifications
app.get('/api/notifications', verifyToken, (_req, res) => {
  // TODO: Connect to real payment/dispute system
  const notifications = [
    {
      id        : 'notif-1',
      type      : 'payment_failed',
      title     : 'Payment Failed',
      message   : 'Stripe payment for job #1042 failed — card declined.',
      timestamp : new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      severity  : 'high',
    },
    {
      id        : 'notif-2',
      type      : 'flagged',
      title     : 'Contractor Flagged',
      message   : 'Contractor "A. Builders Ltd" received 3 complaints this week.',
      timestamp : new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      severity  : 'high',
    },
    {
      id        : 'notif-3',
      type      : 'dispute',
      title     : 'Open Dispute',
      message   : 'Homeowner Sarah M. has opened a dispute for job #988.',
      timestamp : new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      severity  : 'medium',
    },
    {
      id        : 'notif-4',
      type      : 'system',
      title     : 'New Contractor Applications',
      message   : '4 contractor applications are pending review.',
      timestamp : new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      severity  : 'low',
    },
    {
      id        : 'notif-5',
      type      : 'system',
      title     : 'Weekly Summary Ready',
      message   : 'Your weekly platform summary is available in the Reports tab.',
      timestamp : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      severity  : 'low',
    },
  ];

  return res.json(notifications);
});

// ─── 10. GOOGLE SHEETS — HOMEOWNERS ──────────────────────────────────────────

/**
 * Map a flat row array to an object using a header row.
 * Missing columns silently fall back to ''.
 */
function rowsToObjects(headers, dataRows) {
  return dataRows.map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] !== undefined ? row[i] : '';
    });
    return obj;
  });
}

/**
 * Find the 1-based column letter for a named header in a header row.
 * Returns null if not found.
 */
function columnLetterForHeader(headers, name) {
  const idx = headers.findIndex(
    (h) => h.toLowerCase().trim() === name.toLowerCase().trim()
  );
  if (idx < 0) return null;
  // Convert 0-based index to A1-notation column letter (supports A–Z only;
  // extend with double-letter logic if sheets ever exceed 26 columns).
  return String.fromCharCode(65 + idx);
}

// GET /api/sheets/homeowners
app.get('/api/sheets/homeowners', verifyToken, async (req, res) => {
  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId : process.env.HOMEOWNER_SHEET_ID,
      range         : 'Sheet1!A:Z',
    });

    const values  = response.data.values || [];
    const headers = values[0] || ['Name', 'Email', 'Phone', 'Address', 'Service Type', 'Submission Date', 'Status', 'Notes'];
    const data    = values.slice(1);
    const rows    = rowsToObjects(headers, data);

    return res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('[GET /api/sheets/homeowners]', err.message);
    return res.status(500).json({ error: 'Failed to fetch homeowner data' });
  }
});

// PUT /api/sheets/homeowners/:rowIndex
app.put('/api/sheets/homeowners/:rowIndex', verifyToken, async (req, res) => {
  const rowIndex = parseInt(req.params.rowIndex, 10); // 1-based (row 1 of data = sheet row 2)
  const { status, notes } = req.body || {};

  if (isNaN(rowIndex) || rowIndex < 1) {
    return res.status(400).json({ error: 'Invalid rowIndex' });
  }

  try {
    // Read header row to locate the right columns dynamically.
    const headerRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId : process.env.HOMEOWNER_SHEET_ID,
      range         : 'Sheet1!1:1',
    });
    const headers = (headerRes.data.values || [[]])[0] || [];

    // Sheet row number: header = row 1, data row 1 = row 2, etc.
    const sheetRow = rowIndex + 1;

    const updateCells = [];

    if (status !== undefined) {
      const col = columnLetterForHeader(headers, 'Status');
      if (col) {
        updateCells.push({
          range  : `Sheet1!${col}${sheetRow}`,
          values : [[status]],
        });
      }
    }

    if (notes !== undefined) {
      const col = columnLetterForHeader(headers, 'Notes');
      if (col) {
        updateCells.push({
          range  : `Sheet1!${col}${sheetRow}`,
          values : [[notes]],
        });
      }
    }

    if (updateCells.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided (status, notes)' });
    }

    await Promise.all(
      updateCells.map((cell) =>
        sheetsClient.spreadsheets.values.update({
          spreadsheetId    : process.env.HOMEOWNER_SHEET_ID,
          range            : cell.range,
          valueInputOption : 'USER_ENTERED',
          requestBody      : { values: cell.values },
        })
      )
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/sheets/homeowners]', err.message);
    return res.status(500).json({ error: 'Failed to update homeowner row' });
  }
});

// ─── 11. GOOGLE SHEETS — CONTRACTORS ─────────────────────────────────────────

// GET /api/sheets/contractors
app.get('/api/sheets/contractors', verifyToken, async (req, res) => {
  try {
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId : process.env.CONTRACTOR_SHEET_ID,
      range         : 'Sheet1!A:Z',
    });

    const values  = response.data.values || [];
    const headers = values[0] || ['Name', 'Email', 'Phone', 'Address', 'Service Type', 'Submission Date', 'Status', 'Notes'];
    const data    = values.slice(1);
    const rows    = rowsToObjects(headers, data);

    return res.json({ rows, total: rows.length });
  } catch (err) {
    console.error('[GET /api/sheets/contractors]', err.message);
    return res.status(500).json({ error: 'Failed to fetch contractor data' });
  }
});

// PUT /api/sheets/contractors/:rowIndex
app.put('/api/sheets/contractors/:rowIndex', verifyToken, async (req, res) => {
  const rowIndex = parseInt(req.params.rowIndex, 10);
  const { status, notes } = req.body || {};

  if (isNaN(rowIndex) || rowIndex < 1) {
    return res.status(400).json({ error: 'Invalid rowIndex' });
  }

  try {
    const headerRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId : process.env.CONTRACTOR_SHEET_ID,
      range         : 'Sheet1!1:1',
    });
    const headers = (headerRes.data.values || [[]])[0] || [];

    const sheetRow   = rowIndex + 1;
    const updateCells = [];

    if (status !== undefined) {
      const col = columnLetterForHeader(headers, 'Status');
      if (col) {
        updateCells.push({
          range  : `Sheet1!${col}${sheetRow}`,
          values : [[status]],
        });
      }
    }

    if (notes !== undefined) {
      const col = columnLetterForHeader(headers, 'Notes');
      if (col) {
        updateCells.push({
          range  : `Sheet1!${col}${sheetRow}`,
          values : [[notes]],
        });
      }
    }

    if (updateCells.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided (status, notes)' });
    }

    await Promise.all(
      updateCells.map((cell) =>
        sheetsClient.spreadsheets.values.update({
          spreadsheetId    : process.env.CONTRACTOR_SHEET_ID,
          range            : cell.range,
          valueInputOption : 'USER_ENTERED',
          requestBody      : { values: cell.values },
        })
      )
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/sheets/contractors]', err.message);
    return res.status(500).json({ error: 'Failed to update contractor row' });
  }
});

// ─── 12. SERVICE REQUESTS ─────────────────────────────────────────────────────

// Shared helper: proxy a request to the LinX API.
async function linxProxy(method, path, body) {
  const url      = `${process.env.LINX_API_BASE_URL}${path}`;
  const headers  = {
    'Authorization' : `Bearer ${process.env.LINX_API_KEY}`,
    'Content-Type'  : 'application/json',
  };

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LinX API ${method} ${path} → ${response.status}: ${text}`);
  }
  return response.json();
}

// Fallback mock data — remove when LinX API is live.
const MOCK_SERVICES = [
  {
    id          : 'svc-001',
    homeowner   : 'Sarah Mitchell',
    contractor  : 'Unassigned',
    serviceType : 'Electrical',
    status      : 'Pending',
    createdDate : new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id          : 'svc-002',
    homeowner   : 'James Okonkwo',
    contractor  : 'ProFix Ltd',
    serviceType : 'Plumbing',
    status      : 'In Progress',
    createdDate : new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id          : 'svc-003',
    homeowner   : 'Emily Chen',
    contractor  : 'Unassigned',
    serviceType : 'HVAC',
    status      : 'Pending',
    createdDate : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id          : 'svc-004',
    homeowner   : 'Marcus Williams',
    contractor  : 'Skyline Repairs',
    serviceType : 'Roofing',
    status      : 'Completed',
    createdDate : new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id          : 'svc-005',
    homeowner   : 'Priya Patel',
    contractor  : 'Unassigned',
    serviceType : 'Landscaping',
    status      : 'Under Review',
    createdDate : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// GET /api/services
app.get('/api/services', verifyToken, async (_req, res) => {
  try {
    const data = await linxProxy('GET', '/services', null);
    return res.json(data);
  } catch (err) {
    console.warn('[/api/services] LinX API unavailable, using mock data:', err.message);
    // Fallback mock data — remove when LinX API is live.
    return res.json(MOCK_SERVICES);
  }
});

// POST /api/services/:id/approve
app.post('/api/services/:id/approve', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const data = await linxProxy('POST', `/services/${id}/approve`, {});
    return res.json(data);
  } catch (err) {
    console.warn(`[/api/services/${id}/approve] LinX API unavailable:`, err.message);
    // Fallback mock data — remove when LinX API is live.
    return res.json({ success: true, id, status: 'Approved' });
  }
});

// POST /api/services/:id/reject
app.post('/api/services/:id/reject', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const data = await linxProxy('POST', `/services/${id}/reject`, req.body || {});
    return res.json(data);
  } catch (err) {
    console.warn(`[/api/services/${id}/reject] LinX API unavailable:`, err.message);
    // Fallback mock data — remove when LinX API is live.
    return res.json({ success: true, id, status: 'Rejected' });
  }
});

// POST /api/services/:id/assign
app.post('/api/services/:id/assign', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { contractorId } = req.body || {};

  if (!contractorId) {
    return res.status(400).json({ error: 'contractorId is required' });
  }

  try {
    const data = await linxProxy('POST', `/services/${id}/assign`, { contractorId });
    return res.json(data);
  } catch (err) {
    console.warn(`[/api/services/${id}/assign] LinX API unavailable:`, err.message);
    // Fallback mock data — remove when LinX API is live.
    return res.json({ success: true, id, contractorId, status: 'Assigned' });
  }
});

// ─── 13. SETTINGS ─────────────────────────────────────────────────────────────

// GET /api/settings
app.get('/api/settings', verifyToken, (_req, res) => {
  const linxKey = process.env.LINX_API_KEY || '';
  const maskedLinxKey =
    linxKey.length > 8
      ? `${linxKey.slice(0, 3)}****${linxKey.slice(-4)}`
      : linxKey ? '****' : '';

  return res.json({
    sessionTimeout : 1800,
    ipWhitelist    : process.env.IP_WHITELIST  || '',
    webhookUrls    : process.env.WEBHOOK_URLS  || '',
    linxApiKey     : maskedLinxKey,             // masked — never return the real value
    linxApiBaseUrl : process.env.LINX_API_BASE_URL || '',
  });
});

// PUT /api/settings
app.put('/api/settings', verifyToken, (req, res) => {
  const { sessionTimeout, ipWhitelist, webhookUrls } = req.body || {};

  // In production, persist to encrypted config store or update .env and restart.
  // Validate types before logging to avoid injecting unexpected data.
  if (sessionTimeout !== undefined) {
    const t = parseInt(sessionTimeout, 10);
    if (isNaN(t) || t < 300 || t > 86400) {
      return res
        .status(400)
        .json({ error: 'sessionTimeout must be a number between 300 and 86400 seconds' });
    }
    console.log(`[SETTINGS] sessionTimeout updated to ${t}s by admin`);
  }

  if (ipWhitelist !== undefined) {
    console.log(`[SETTINGS] ipWhitelist updated by admin: "${ipWhitelist}"`);
  }

  if (webhookUrls !== undefined) {
    console.log(`[SETTINGS] webhookUrls updated by admin: "${webhookUrls}"`);
  }

  return res.json({ success: true });
});

// ─── 14. LEADS API ────────────────────────────────────────────────────────────

/**
 * Helper: load registered contractors from Google Sheets for pipeline matching.
 * Returns a simplified array of contractor objects. Falls back to [] on error.
 */
async function loadContractors() {
  try {
    const res = await sheetsClient.spreadsheets.values.get({
      spreadsheetId : process.env.CONTRACTOR_SHEET_ID,
      range         : 'Sheet1!A:Z',
    });
    const rows    = res.data.values || [];
    const headers = rows[0] || [];
    return rows.slice(1).map((row, i) => {
      const obj = {};
      headers.forEach((h, j) => { obj[h.toLowerCase().replace(/\s+/g, '_')] = row[j] || ''; });
      return {
        id              : obj.id       || `c-${i + 1}`,
        name            : obj.name     || '',
        email           : obj.email    || '',
        postalCode      : obj.postal_code || obj.address?.match(/[A-Z]\d[A-Z]\s?\d[A-Z]\d/i)?.[0] || '',
        serviceRadiusKm : parseInt(obj.service_radius_km || '50', 10),
        serviceCities   : (obj.service_cities || '').split(',').map((c) => c.trim()).filter(Boolean),
        categories      : (obj.service_type || obj.categories || '').toLowerCase()
                            .split(/[,;]/).map((c) => c.trim().replace(/\s+/g, '_')).filter(Boolean),
      };
    });
  } catch {
    return [];
  }
}

// GET /api/leads — paginated lead board (requires auth)
app.get('/api/leads', verifyToken, (req, res) => {
  const {
    category,
    city,
    source,
    status    = 'active',
    limit     = '50',
    offset    = '0',
    freshness = String(72 * 60 * 60 * 1000),
  } = req.query;

  const leads = leadStore.getLeads({
    category,
    city,
    sourcePlatform : source,
    status,
    freshnessMs    : parseInt(freshness, 10) || 72 * 60 * 60 * 1000,
    limit          : Math.min(parseInt(limit, 10) || 50, 200),
    offset         : parseInt(offset, 10) || 0,
  });

  return res.json({ leads, total: leads.length });
});

// GET /api/leads/stats — aggregate stats for dashboard
app.get('/api/leads/stats', verifyToken, (_req, res) => {
  return res.json(leadStore.getStats());
});

// GET /api/leads/categories — list all trade categories
app.get('/api/leads/categories', verifyToken, (_req, res) => {
  return res.json(getCategories());
});

// GET /api/leads/:id — single lead detail
app.get('/api/leads/:id', verifyToken, (req, res) => {
  const lead = leadStore.getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  return res.json(lead);
});

// POST /api/leads — submit an organic lead (homeowner posted on LinxServices)
app.post('/api/leads', verifyToken, async (req, res) => {
  const { title, description, city, province, postalCode, contactMethod, sourceUrl } = req.body || {};

  if (!title) return res.status(400).json({ error: 'title is required' });

  const contractors = await loadContractors();
  const result = await processLead(
    {
      title,
      description    : description || '',
      city           : city || '',
      province       : province || '',
      postalCode     : postalCode || '',
      contactMethod  : contactMethod || '',
      sourceUrl      : sourceUrl || '',
      sourcePlatform : 'organic',
      postedAt       : new Date().toISOString(),
    },
    contractors,
    { notify: true }
  );

  if (result.duplicate) {
    return res.status(409).json({ error: 'Duplicate lead', reason: result.reason });
  }

  return res.status(201).json({ lead: result.lead, category: result.category, notified: result.notified });
});

// PATCH /api/leads/:id — update lead status or claimedBy
app.patch('/api/leads/:id', verifyToken, (req, res) => {
  const { status, claimedBy } = req.body || {};
  const allowed = ['active', 'archived', 'expired', 'claimed'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  const updates = {};
  if (status)    updates.status    = status;
  if (claimedBy) updates.claimedBy = claimedBy;
  const updated = leadStore.updateLead(req.params.id, updates);
  if (!updated) return res.status(404).json({ error: 'Lead not found' });
  return res.json(updated);
});

// ─── 15. CRAWLER API ─────────────────────────────────────────────────────────

// GET /api/crawler/status — real-time crawler status
app.get('/api/crawler/status', verifyToken, (_req, res) => {
  return res.json(crawler.getStatus());
});

// POST /api/crawler/start — start background scheduler
app.post('/api/crawler/start', verifyToken, async (req, res) => {
  const contractors = await loadContractors();
  crawler.start(contractors);
  return res.json({ success: true, message: 'Crawler scheduler started' });
});

// POST /api/crawler/stop — stop background scheduler
app.post('/api/crawler/stop', verifyToken, (_req, res) => {
  crawler.stop();
  return res.json({ success: true, message: 'Crawler scheduler stopped' });
});

// POST /api/crawler/run — trigger a single manual crawl cycle
app.post('/api/crawler/run', verifyToken, async (req, res) => {
  const contractors = await loadContractors();
  // Respond immediately; cycle runs in background
  res.json({ success: true, message: 'Crawl cycle triggered' });
  crawler.runCycle(contractors).catch(console.error);
});

// POST /api/leads/ingest — bulk ingest raw leads from external source (webhook intake)
app.post('/api/leads/ingest', verifyToken, async (req, res) => {
  const { leads: rawLeads } = req.body || {};
  if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
    return res.status(400).json({ error: 'leads array is required' });
  }
  const contractors = await loadContractors();
  const result = await processBatch(rawLeads.slice(0, 100), contractors, { notify: true });
  return res.json(result);
});

// ─── 16. REACT DASHBOARD API ALIASES ─────────────────────────────────────────
// The React admin SPA uses /_api_* paths. These are thin aliases that delegate
// to the canonical /api/* handlers so both the legacy HTML dashboard and the
// new React dashboard share the same business logic.

app.post('/_api_auth_login',   loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password are required' });

  const usernameMatch = username === process.env.ADMIN_USERNAME;
  let passwordMatch   = false;
  if (usernameMatch) {
    try { passwordMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH); }
    catch (_) { passwordMatch = false; }
  }
  if (!usernameMatch || !passwordMatch) {
    console.error(`[AUTH FAIL] ${new Date().toISOString()} IP:${req.ip} user:${username}`);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ sub: username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30m' });
  return res.json({ token, expiresIn: 1800 });
});

app.post('/_api_auth_refresh', verifyToken, (req, res) => {
  const token = jwt.sign(
    { sub: req.admin.sub, role: req.admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
  return res.json({ token, expiresIn: 1800 });
});

app.get('/_api_crawler_status', verifyToken, (_req, res) => res.json(crawler.getStatus()));

app.post('/_api_crawler_start', verifyToken, async (_req, res) => {
  const contractors = await loadContractors();
  crawler.start(contractors);
  return res.json({ success: true, message: 'Crawler scheduler started' });
});

app.post('/_api_crawler_stop', verifyToken, (_req, res) => {
  crawler.stop();
  return res.json({ success: true, message: 'Crawler scheduler stopped' });
});

app.get('/_api_leads_stats', verifyToken, (_req, res) => res.json(leadStore.getStats()));

app.get('/_api_leads_categories', verifyToken, (_req, res) => {
  const cats = getCategories();
  // Normalise to [{ category, count }] shape expected by the React charts.
  const all = leadStore.getLeads({ limit: 1000 });
  const counts = {};
  all.forEach((lead) => {
    const c = lead.category || 'uncategorized';
    counts[c] = (counts[c] || 0) + 1;
  });
  const result = cats.map((c) => ({ category: c, count: counts[c] || 0 }));
  return res.json(result);
});

app.get('/_api_leads_sources', verifyToken, (_req, res) => {
  const all = leadStore.getLeads({ limit: 1000 });
  const counts = {};
  all.forEach((lead) => {
    const s = lead.sourcePlatform || 'unknown';
    counts[s] = (counts[s] || 0) + 1;
  });
  const result = Object.entries(counts).map(([source, count]) => ({ source, count }));
  return res.json(result);
});

app.get('/_api_leads', verifyToken, (req, res) => {
  const {
    category, city, source,
    status    = 'active',
    limit     = '20',
    offset    = '0',
    freshness = String(72 * 60 * 60 * 1000),
  } = req.query;

  const leads = leadStore.getLeads({
    category,
    city,
    sourcePlatform : source,
    status,
    freshnessMs    : parseInt(freshness, 10) || 72 * 60 * 60 * 1000,
    limit          : Math.min(parseInt(limit, 10) || 20, 200),
    offset         : parseInt(offset, 10) || 0,
  });
  return res.json(leads);
});

// ─── 17. CATCH-ALL ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── 17. SERVER START ─────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`LinX Admin Server running on port ${PORT}`);
  console.log(
    `IP whitelist: ${process.env.IP_WHITELIST || 'disabled (all IPs allowed)'}`
  );

  // Auto-start crawler if CRAWLER_AUTO_START=true
  if (process.env.CRAWLER_AUTO_START === 'true') {
    loadContractors()
      .then((contractors) => { crawler.start(contractors); })
      .catch(console.error);
  }
});
