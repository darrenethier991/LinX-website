-- Phase 1: D1-backed manual intake and approved-source lead pipeline.

CREATE TABLE IF NOT EXISTS lead_sources (
  id                   TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  source_type          TEXT NOT NULL DEFAULT 'other',
  vertical             TEXT NOT NULL DEFAULT '',
  mode                 TEXT NOT NULL DEFAULT 'manual',
  approval_status      TEXT NOT NULL DEFAULT 'draft',
  has_owner_permission INTEGER NOT NULL DEFAULT 0,
  robots_allows_crawl  INTEGER NOT NULL DEFAULT 0,
  feed_url             TEXT NOT NULL DEFAULT '',
  field_mapping        TEXT NOT NULL DEFAULT '{}',
  max_requests_per_minute INTEGER NOT NULL DEFAULT 1,
  max_concurrent       INTEGER NOT NULL DEFAULT 1,
  crawl_window         TEXT NOT NULL DEFAULT '',
  owner_contact        TEXT NOT NULL DEFAULT '',
  status               TEXT NOT NULL DEFAULT 'inactive',
  last_run_at          TEXT,
  last_status          TEXT NOT NULL DEFAULT 'not_configured',
  last_error           TEXT NOT NULL DEFAULT '',
  created_by           TEXT NOT NULL DEFAULT '',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lead_sources_mode_status ON lead_sources(mode, approval_status, status);

CREATE TABLE IF NOT EXISTS lead_import_runs (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL,
  import_mode TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'processing',
  received    INTEGER NOT NULL DEFAULT 0,
  valid       INTEGER NOT NULL DEFAULT 0,
  added       INTEGER NOT NULL DEFAULT 0,
  duplicates  INTEGER NOT NULL DEFAULT 0,
  rejected    INTEGER NOT NULL DEFAULT 0,
  errors      TEXT NOT NULL DEFAULT '[]',
  created_by  TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_lead_import_runs_source_created ON lead_import_runs(source_id, created_at DESC);

ALTER TABLE leads ADD COLUMN source_id TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
