-- Consent, contact fields, and idempotent delivery records for approved subscriber automation.
ALTER TABLE platform_users ADD COLUMN phone_e164 TEXT;
ALTER TABLE platform_users ADD COLUMN company TEXT;
ALTER TABLE platform_users ADD COLUMN sms_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE platform_users ADD COLUMN sms_consent_at TEXT;
ALTER TABLE platform_users ADD COLUMN sms_consent_source TEXT;

CREATE TABLE IF NOT EXISTS signup_delivery_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('google_sheet_sync', 'owner_notification', 'welcome_sms')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'skipped', 'failed')),
  external_id TEXT,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_signup_delivery_events_user ON signup_delivery_events(user_id, event_type, status);
