-- LinX contractor lead claim-tracking + safeguards.
-- Purely additive in effect: rebuilds contractor_leads ONLY to widen its
-- status CHECK (SQLite cannot alter a CHECK in place) and to add activity /
-- alert columns. Every existing row is copied across unchanged.
--
-- New statuses: claimed, contacted, quoted, booked, lost.
-- Legacy statuses kept so old rows keep working: 'accepted' behaves like
-- 'claimed'; 'declined' stays terminal. 'new' is the only unclaimed state,
-- and no transition ever goes back to 'new' (enforced by the API).
--
-- New columns on contractor_leads:
--   last_activity_at               — updated on every status change; drives
--                                    the "claimed but not contacted" safeguard
--                                    and the contractor app's "Last activity".
--   unclaimed_alert_sent_at        — set when the 24h unclaimed alert is
--                                    attempted once, so a lead never re-alerts
--                                    every hour. To re-alert after fixing an
--                                    email-config problem, clear this column
--                                    for the lead (UPDATE ... SET
--                                    unclaimed_alert_sent_at = NULL).
--   contact_overdue_alert_sent_at  — same, for the 48h contact-overdue alert.
--
-- New table contractor_lead_events: the audit trail. One row per status
-- change (contractor / system / admin actor), plus one row per stale alert
-- (actor 'system'). Never deleted by the app.

PRAGMA foreign_keys=OFF;

CREATE TABLE IF NOT EXISTS contractor_leads_new (
  id TEXT PRIMARY KEY,
  contractor_id TEXT NOT NULL,
  homeowner_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  trade TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'claimed', 'contacted', 'quoted', 'booked', 'lost', 'declined', 'accepted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  unclaimed_alert_sent_at TEXT,
  contact_overdue_alert_sent_at TEXT,
  FOREIGN KEY (contractor_id) REFERENCES contractor_users(id)
);

INSERT INTO contractor_leads_new (id, contractor_id, homeowner_name, phone, address, trade, description, status, created_at, last_activity_at)
SELECT id, contractor_id, homeowner_name, phone, address, trade, description, status, created_at, created_at
FROM contractor_leads
WHERE NOT EXISTS (SELECT 1 FROM contractor_leads_new AS n WHERE n.id = contractor_leads.id);

DROP TABLE contractor_leads;

ALTER TABLE contractor_leads_new RENAME TO contractor_leads;

CREATE INDEX IF NOT EXISTS idx_contractor_leads_contractor ON contractor_leads(contractor_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_contractor_leads_stale ON contractor_leads(status, created_at, last_activity_at);

CREATE TABLE IF NOT EXISTS contractor_lead_events (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  contractor_id TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'contractor' CHECK (actor IN ('contractor', 'system', 'admin')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (lead_id) REFERENCES contractor_leads(id),
  FOREIGN KEY (contractor_id) REFERENCES contractor_users(id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_lead_events_lead ON contractor_lead_events(lead_id, created_at);

PRAGMA foreign_keys=ON;
