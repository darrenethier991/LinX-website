-- LinX Contractor App backend: contractor sign-in, leads, jobs, earnings.
-- Purely additive: creates only new tables + indexes, seeds only the two real
-- contractor rows. No existing table, route, or binding is touched.
--
-- IMPORTANT — access codes are NOT issued yet.
-- access_code_hash = 'PENDING_ISSUE' means Darren has not given that contractor
-- a code, and the login endpoint rejects PENDING_ISSUE explicitly, so neither
-- account can sign in until a real code is issued.
--
-- To issue a real access code for a contractor:
--   1. Generate a code and hand it to the contractor out-of-band:
--        node -e "console.log(require('crypto').randomBytes(12).toString('hex').toUpperCase())"
--   2. Hash the code (the worker stores only the SHA-256 hex, never the code):
--        node -e "const c=require('crypto');console.log(c.createHash('sha256').update('CODE-HERE').digest('hex'))"
--   3. Store the hash:
--        UPDATE contractor_users SET access_code_hash = '<sha256-hex-of-the-code>' WHERE id = 'billy-stevens';

CREATE TABLE IF NOT EXISTS contractor_users (
  id TEXT PRIMARY KEY,
  trade TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  access_code_hash TEXT NOT NULL DEFAULT 'PENDING_ISSUE',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contractor_users_email ON contractor_users(email);

-- Leads assigned to a contractor. Empty at seed time: leads only arrive via
-- the real assignment flow, so this starts at an honest zero.
CREATE TABLE IF NOT EXISTS contractor_leads (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL,
  homeowner_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  trade TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'accepted', 'declined')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contractor_id) REFERENCES contractor_users(id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_leads_contractor ON contractor_leads(contractor_id, status, created_at);

-- Jobs a contractor is working. status_step is a 1-5 progress ladder;
-- only forward-by-one moves are allowed by the API.
CREATE TABLE IF NOT EXISTS contractor_jobs (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL,
  lead_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  status_step INTEGER NOT NULL DEFAULT 1 CHECK (status_step BETWEEN 1 AND 5),
  scheduled_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contractor_id) REFERENCES contractor_users(id),
  FOREIGN KEY (lead_id) REFERENCES contractor_leads(id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_jobs_contractor ON contractor_jobs(contractor_id, created_at);

-- Payouts owed to a contractor. Empty at seed time: amounts are only recorded
-- by the real payout flow, never invented.
CREATE TABLE IF NOT EXISTS contractor_payouts (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL,
  job_id TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (contractor_id) REFERENCES contractor_users(id),
  FOREIGN KEY (job_id) REFERENCES contractor_jobs(id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_payouts_contractor ON contractor_payouts(contractor_id, status, created_at);

-- Sign-in attempt log used for login rate limiting (max 10 attempts / 15 min
-- per IP). ip_hash is SHA-256 of the salted client IP, never the raw IP.
CREATE TABLE IF NOT EXISTS contractor_login_attempts (
  ip_hash TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contractor_login_attempts_ip ON contractor_login_attempts(ip_hash, attempted_at);

-- Seed: the two real LinX contractors. access_code_hash stays 'PENDING_ISSUE'
-- until Darren issues codes (see instructions above). No fake leads, jobs, or
-- payouts are seeded — empty states are the honest starting point.
INSERT INTO contractor_users (id, trade, display_name, company, email, phone, access_code_hash, active)
SELECT 'billy-stevens', 'Electrical', 'Billy Stevens', 'Top Era Electric Inc.', 'bstevens@toperaelectric.com', '', 'PENDING_ISSUE', 1
WHERE NOT EXISTS (SELECT 1 FROM contractor_users WHERE id = 'billy-stevens');

INSERT INTO contractor_users (id, trade, display_name, company, email, phone, access_code_hash, active)
SELECT 'joey', 'Roofing', 'Joey', 'All Northern Roofing', 'allnorthernroofingjh24@outlook.com', '705-718-0039', 'PENDING_ISSUE', 1
WHERE NOT EXISTS (SELECT 1 FROM contractor_users WHERE id = 'joey');
