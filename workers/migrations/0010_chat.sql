-- Contractor ↔ homeowner chat: conversations linked to a CRM lead/match,
-- per-side access tokens (no full user auth needed for MVP), AI mediator flags.

CREATE TABLE IF NOT EXISTS chat_conversations (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  homeowner_name TEXT NOT NULL DEFAULT '',
  contractor_name TEXT NOT NULL DEFAULT '',
  homeowner_token TEXT NOT NULL,
  contractor_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_lead ON chat_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status, created_at);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('homeowner', 'contractor', 'mediator', 'system')),
  body TEXT NOT NULL,
  flagged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at);
