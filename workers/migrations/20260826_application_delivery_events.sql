CREATE TABLE IF NOT EXISTS application_delivery_events (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  last_error TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES launch_early_access_applications(id)
);

CREATE INDEX IF NOT EXISTS idx_application_delivery_events_application_status
  ON application_delivery_events (application_id, status);
