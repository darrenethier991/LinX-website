-- LinX D1 migration: initial leads schema
-- Apply with:  wrangler d1 migrations apply linx-db --remote

CREATE TABLE IF NOT EXISTS leads (
  id              TEXT    PRIMARY KEY,          -- UUID v4
  content_hash    TEXT    NOT NULL UNIQUE,      -- SHA-256 for dedup
  title           TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  source_url      TEXT    NOT NULL DEFAULT '',
  source_platform TEXT    NOT NULL DEFAULT 'unknown',
  posted_at       TEXT    NOT NULL,             -- ISO-8601
  scraped_at      TEXT    NOT NULL,             -- ISO-8601
  category        TEXT    NOT NULL DEFAULT 'general',
  category_score  REAL    NOT NULL DEFAULT 0,
  city            TEXT    NOT NULL DEFAULT '',
  province        TEXT    NOT NULL DEFAULT '',
  postal_code     TEXT    NOT NULL DEFAULT '',
  contact_method  TEXT    NOT NULL DEFAULT '',
  status          TEXT    NOT NULL DEFAULT 'active',  -- active|archived|expired|claimed
  claimed_by      TEXT,
  raw             TEXT    NOT NULL DEFAULT '',
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_status          ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_category        ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_source_platform ON leads(source_platform);
CREATE INDEX IF NOT EXISTS idx_leads_posted_at       ON leads(posted_at);
CREATE INDEX IF NOT EXISTS idx_leads_city            ON leads(city);

CREATE TABLE IF NOT EXISTS crawler_runs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  ended_at   TEXT,
  added      INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  notified   INTEGER NOT NULL DEFAULT 0,
  errors     TEXT NOT NULL DEFAULT '[]'   -- JSON array of error strings
);
