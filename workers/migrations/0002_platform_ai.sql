-- LINX Services platform accounts, entitlement records, privacy-safe telemetry, and Clam Code usage.
-- Apply with: npx wrangler d1 migrations apply linx-db-staging --remote

CREATE TABLE IF NOT EXISTS platform_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'invited')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscription_entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'approved',
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'cancelled', 'expired')),
  source TEXT NOT NULL DEFAULT 'manual_approval' CHECK (source IN ('manual_approval', 'stripe', 'import')),
  starts_at TEXT,
  ends_at TEXT,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_users_role ON platform_users(role);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_status ON subscription_entitlements(user_id, status);

CREATE TABLE IF NOT EXISTS access_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_access_codes_user_expiry ON access_codes(user_id, expires_at);

CREATE TABLE IF NOT EXISTS page_events (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN ('public', 'subscriber', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_page_events_created_path ON page_events(created_at, path);

CREATE TABLE IF NOT EXISTS site_content (
  content_key TEXT PRIMARY KEY,
  content_value TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('public', 'subscriber', 'admin')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_messages INTEGER NOT NULL DEFAULT 0,
  input_characters INTEGER NOT NULL DEFAULT 0,
  output_characters INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost REAL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'rate_limited')),
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created_role ON ai_usage_events(created_at, role);
