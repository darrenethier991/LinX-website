-- Administrator-only Clam Code engineering workspace audit trail.
CREATE TABLE IF NOT EXISTS engineering_change_proposals (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  summary         TEXT NOT NULL DEFAULT '',
  changes_json    TEXT NOT NULL,
  test_command    TEXT NOT NULL DEFAULT 'npm run test:worker',
  status          TEXT NOT NULL DEFAULT 'queued',
  review_branch   TEXT NOT NULL DEFAULT '',
  github_commit   TEXT NOT NULL DEFAULT '',
  requested_by    TEXT NOT NULL DEFAULT '',
  confirmed_at    TEXT,
  pushed_at       TEXT,
  last_error      TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_engineering_proposals_status_created ON engineering_change_proposals(status, created_at DESC);
