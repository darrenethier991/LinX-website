/**
 * LinX Contractor App — self-contained API module.
 * ─────────────────────────────────────────────────────────────────────────────
 * Contractor sign-in (access-code based), leads, jobs, and earnings.
 * Every authenticated query is scoped WHERE contractor_id = <verified JWT
 * contractor_id>, so a contractor can never see another contractor's data.
 *
 * This module is intentionally self-contained: its own CORS/json helper,
 * its own HMAC-SHA-256 JWT helpers (mirroring index.js), and its own
 * constant-time access-code comparison. Nothing from index.js is imported,
 * so it can be moved or tested in isolation.
 *
 * Sign-in model
 * ─────────────
 * The contractor enters an access code issued by Darren. The worker stores
 * only the SHA-256 hex digest of the code (never the code itself). A stored
 * value of 'PENDING_ISSUE' means no code has been issued yet and is rejected
 * explicitly — it can never authenticate.
 *
 * Rate limiting
 * ─────────────
 * Sign-in attempts are logged in contractor_login_attempts keyed by a
 * salted SHA-256 hash of the client IP (never the raw IP). Max 10 attempts
 * per rolling 15-minute window per IP.
 */

// ─── CORS + json helper (mirrors index.js) ───────────────────────────────────

function corsHeaders(origin) {
  const allowed = /^https?:\/\/(linxservices\.ca|[a-z0-9-]+\.linxservices\.ca|localhost(:\d+)?|127\.0\.0\.1(:\d+)?)$/;
  const allow   = allowed.test(origin || '') ? origin : 'https://linxservices.ca';
  return {
    'Access-Control-Allow-Origin'      : allow,
    'Access-Control-Allow-Methods'     : 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers'     : 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials' : 'true',
  };
}

function json(obj, status = 200, origin = '') {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// ─── base64url + HMAC-SHA-256 JWT (mirrors index.js) ──────────────────────────

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + (4 - (str.length % 4)) % 4, '='
  );
  const bin = atob(padded);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function jwtSign(payload, secret) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body   = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key    = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

async function jwtVerify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC', key,
    b64urlDecode(sig),
    new TextEncoder().encode(`${header}.${body}`)
  );
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

// ─── Pure helpers (exported for unit tests) ──────────────────────────────────

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison. Web Crypto's timingSafeEqual is not
 * guaranteed in Workers, so this manual XOR-fold is used for access-code
 * hash comparisons. Returns true only when both strings are identical.
 */
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validate a job progress move. Returns { ok: true } when `step` is either
 * the same step (idempotent) or exactly one step forward; otherwise
 * { ok: false, error }.
 */
function validateJobStepTransition(currentStep, step) {
  if (!Number.isInteger(step) || step < 1 || step > 5) {
    return { ok: false, error: 'Job progress step must be an integer from 1 to 5.' };
  }
  if (step === currentStep) return { ok: true, noop: true };
  if (step === currentStep + 1) return { ok: true, noop: false };
  return { ok: false, error: 'Job progress can only move forward one step at a time.' };
}

// Sentinel for "no access code issued yet". Rejected explicitly at login.
const PENDING_ISSUE = 'PENDING_ISSUE';

const TRADE_LABELS = {
  Electrical: 'Electrical',
  Roofing: 'Roofing',
};

/** Public contractor view — never includes access_code_hash. */
function contractorPublicView(row) {
  if (!row) return null;
  return {
    id: row.id,
    trade: row.trade,
    trade_label: TRADE_LABELS[row.trade] || String(row.trade || ''),
    display_name: row.display_name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    active: row.active === 1 || row.active === true,
    created_at: row.created_at,
  };
}

function leadView(row) {
  if (!row) return null;
  return {
    id: row.id,
    homeowner_name: row.homeowner_name,
    phone: row.phone,
    address: row.address,
    trade: row.trade,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
  };
}

function jobView(row) {
  if (!row) return null;
  return {
    id: row.id,
    lead_id: row.lead_id,
    title: row.title,
    address: row.address,
    status_step: row.status_step,
    scheduled_date: row.scheduled_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function payoutView(row) {
  if (!row) return null;
  return {
    id: row.id,
    job_id: row.job_id,
    amount_cents: row.amount_cents,
    status: row.status,
    paid_at: row.paid_at,
    created_at: row.created_at,
  };
}

async function readBody(req) {
  try { return await req.json(); } catch { return {}; }
}

function clientIpHashInput(request, env) {
  const ip = String(request.headers.get('CF-Connecting-IP') || 'unknown').trim();
  return `${env.JWT_SECRET}:contractor-login:${ip}`;
}

/**
 * Authenticate the request as a contractor. Returns { contractor } on success
 * or { error: Response } on failure (401/503). The contractor row is re-read
 * from the DB on every call so a deactivated contractor loses access
 * immediately, and the hash is never exposed.
 */
async function contractorAuth(request, env, origin) {
  if (!env.DB) return { error: json({ error: 'Contractor storage is not configured.' }, 503, origin) };
  if (!env.JWT_SECRET) return { error: json({ error: 'Sign-in is not configured.' }, 503, origin) };
  const auth  = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { error: json({ error: 'Sign-in is required.' }, 401, origin) };
  const payload = await jwtVerify(token, env.JWT_SECRET);
  if (!payload || !payload.contractor_id) {
    return { error: json({ error: 'Sign-in is invalid or has expired.' }, 401, origin) };
  }
  const contractor = await env.DB.prepare(
    'SELECT id, trade, display_name, company, email, phone, active, created_at FROM contractor_users WHERE id = ? AND active = 1'
  ).bind(String(payload.contractor_id)).first();
  if (!contractor) {
    return { error: json({ error: 'Sign-in is invalid or has expired.' }, 401, origin) };
  }
  return { contractor };
}

// ─── POST /api/contractor/login ──────────────────────────────────────────────
// Body: { code }. Returns { ok, token } on success. JWT expires after 12h.

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;

export async function contractorLogin(request, env, origin = '') {
  if (!env.DB) return json({ error: 'Contractor storage is not configured.' }, 503, origin);
  if (!env.JWT_SECRET) return json({ error: 'Sign-in is not configured.' }, 503, origin);

  // Rate limit by salted IP hash: 10 attempts per rolling 15 minutes.
  const ipHash = await sha256hex(clientIpHashInput(request, env));
  try {
    await env.DB.prepare(
      "DELETE FROM contractor_login_attempts WHERE attempted_at < datetime('now', ?)"
    ).bind(`-${LOGIN_ATTEMPT_WINDOW_MINUTES} minutes`).run();
    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM contractor_login_attempts WHERE ip_hash = ?'
    ).bind(ipHash).first();
    if ((recent?.n || 0) >= LOGIN_ATTEMPT_LIMIT) {
      return json({ error: 'Too many sign-in attempts. Please try again later.' }, 429, origin);
    }
    await env.DB.prepare('INSERT INTO contractor_login_attempts (ip_hash) VALUES (?)').bind(ipHash).run();
  } catch (error) {
    console.warn('[Contractor login] Rate-limit check failed', error?.message || error);
  }

  const { code } = await readBody(request);
  const normalized = String(code || '').trim();
  if (!normalized) return json({ error: 'An access code is required.' }, 400, origin);

  const codeHash = await sha256hex(normalized);

  // Compare against every active contractor's stored hash with a constant-time
  // comparison. PENDING_ISSUE rows are rejected explicitly — they can never
  // authenticate, regardless of the code entered.
  let matched = null;
  try {
    const rows = await env.DB.prepare(
      'SELECT id, access_code_hash FROM contractor_users WHERE active = 1'
    ).all();
    for (const row of rows.results || []) {
      const stored = String(row.access_code_hash || '');
      if (stored === PENDING_ISSUE) continue; // no code issued yet
      if (constantTimeEqual(codeHash, stored)) { matched = row; break; }
    }
  } catch (error) {
    console.warn('[Contractor login] Lookup failed', error?.message || error);
    return json({ error: 'Sign-in is temporarily unavailable.' }, 503, origin);
  }

  if (!matched) {
    return json({ error: 'That access code is not valid.' }, 401, origin);
  }

  const token = await jwtSign(
    { contractor_id: matched.id, exp: Math.floor(Date.now() / 1000) + 12 * 3600 },
    env.JWT_SECRET
  );
  return json({ ok: true, token }, 200, origin);
}

// ─── GET /api/contractor/me ──────────────────────────────────────────────────

export async function contractorMe(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  return json({ ok: true, contractor: contractorPublicView(auth.contractor) }, 200, origin);
}

// ─── GET /api/contractor/leads ───────────────────────────────────────────────
// New (unhandled) leads for this contractor, newest first. Empty list when
// none — never invented.

export async function contractorLeads(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const rows = await env.DB.prepare(
    "SELECT id, homeowner_name, phone, address, trade, description, status, created_at FROM contractor_leads WHERE contractor_id = ? AND status = 'new' ORDER BY created_at DESC, rowid DESC"
  ).bind(auth.contractor.id).all();
  return json({ ok: true, leads: (rows.results || []).map(leadView) }, 200, origin);
}

// ─── POST /api/contractor/leads/:id/accept | /decline ────────────────────────
// Only when the lead is still 'new' AND belongs to this contractor.

export async function contractorLeadAction(request, env, origin = '', leadId = '', action = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const nextStatus = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : null;
  if (!nextStatus) return json({ error: 'Not found.' }, 404, origin);
  if (!leadId) return json({ error: 'A lead id is required.' }, 400, origin);

  const result = await env.DB.prepare(
    "UPDATE contractor_leads SET status = ? WHERE id = ? AND contractor_id = ? AND status = 'new'"
  ).bind(nextStatus, leadId, auth.contractor.id).run();
  if (!result.meta || result.meta.changes === 0) {
    return json({ error: 'Lead not found or already handled.' }, 404, origin);
  }
  const lead = await env.DB.prepare(
    'SELECT id, homeowner_name, phone, address, trade, description, status, created_at FROM contractor_leads WHERE id = ? AND contractor_id = ?'
  ).bind(leadId, auth.contractor.id).first();
  return json({ ok: true, lead: leadView(lead) }, 200, origin);
}

// ─── GET /api/contractor/jobs ────────────────────────────────────────────────
// Jobs for this contractor, newest first. Empty list when none.

export async function contractorJobs(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const rows = await env.DB.prepare(
    'SELECT id, lead_id, title, address, status_step, scheduled_date, notes, created_at, updated_at FROM contractor_jobs WHERE contractor_id = ? ORDER BY created_at DESC, rowid DESC'
  ).bind(auth.contractor.id).all();
  return json({ ok: true, jobs: (rows.results || []).map(jobView) }, 200, origin);
}

// ─── POST /api/contractor/jobs/:id/status ────────────────────────────────────
// Body: { step }. Only forward movement by exactly +1, or setting the same
// step idempotently. Contractor-scoped.

export async function contractorJobStatus(request, env, origin = '', jobId = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  if (!jobId) return json({ error: 'A job id is required.' }, 400, origin);
  const { step } = await readBody(request);

  const job = await env.DB.prepare(
    'SELECT id, lead_id, title, address, status_step, scheduled_date, notes, created_at, updated_at FROM contractor_jobs WHERE id = ? AND contractor_id = ?'
  ).bind(jobId, auth.contractor.id).first();
  if (!job) return json({ error: 'Job not found.' }, 404, origin);

  const check = validateJobStepTransition(job.status_step, Number(step));
  if (!check.ok) return json({ error: check.error }, 400, origin);

  if (!check.noop) {
    await env.DB.prepare(
      "UPDATE contractor_jobs SET status_step = ?, updated_at = datetime('now') WHERE id = ? AND contractor_id = ?"
    ).bind(Number(step), jobId, auth.contractor.id).run();
    job.status_step = Number(step);
    job.updated_at = new Date().toISOString();
  }
  return json({ ok: true, job: jobView(job) }, 200, origin);
}

// ─── GET /api/contractor/earnings ────────────────────────────────────────────
// Totals computed live from contractor_payouts — honest zeros when empty.

export async function contractorEarnings(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const totals = await env.DB.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END), 0) AS pending_total_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0) AS paid_total_cents
    FROM contractor_payouts
    WHERE contractor_id = ?
  `).bind(auth.contractor.id).first();
  const rows = await env.DB.prepare(
    'SELECT id, job_id, amount_cents, status, paid_at, created_at FROM contractor_payouts WHERE contractor_id = ? ORDER BY created_at DESC, rowid DESC'
  ).bind(auth.contractor.id).all();
  return json({
    ok: true,
    pending_total_cents: totals?.pending_total_cents || 0,
    paid_total_cents: totals?.paid_total_cents || 0,
    payouts: (rows.results || []).map(payoutView),
  }, 200, origin);
}

// ─── GET /api/contractor/profile ─────────────────────────────────────────────
// Same as /me plus trade-specific info.

export async function contractorProfile(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const contractor = contractorPublicView(auth.contractor);
  return json({
    ok: true,
    contractor,
    trade_info: { trade: contractor.trade, trade_label: contractor.trade_label },
  }, 200, origin);
}

// Pure helpers exported for unit testing.
export { sha256hex, constantTimeEqual, validateJobStepTransition, contractorPublicView };
