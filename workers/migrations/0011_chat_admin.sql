-- Chat admin additions: unread tracking, admin email nudges, tip submissions.
-- Extends 0010_chat.sql (chat_conversations, chat_messages).

-- Per-admin read tracking for unread badges in the admin Messages panel.
-- admin_id is the JWT sub of the admin who opened the transcript.
CREATE TABLE IF NOT EXISTS admin_chat_read (
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id),
  admin_id TEXT NOT NULL,
  last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (conversation_id, admin_id)
);

-- Rate-limit for the 15-minute unread-message email nudge to Darren.
ALTER TABLE chat_conversations ADD COLUMN last_admin_nudge_at TEXT;

-- Contractor tip submissions (reviewed in the admin Tips Review panel).
-- Approved tips are served publicly via GET /api/tips and render on tips.html.
CREATE TABLE IF NOT EXISTS tip_submissions (
  id TEXT PRIMARY KEY,
  contractor_name TEXT NOT NULL,
  email TEXT NOT NULL,
  trade TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tip_submissions_status ON tip_submissions(status);
