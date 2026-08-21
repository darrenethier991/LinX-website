-- Durable branded links and privacy-minimized aggregate click observations.
CREATE TABLE IF NOT EXISTS short_links (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  destination_url TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  created_by      TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_clicked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_short_links_status_created ON short_links(status, created_at DESC);

CREATE TABLE IF NOT EXISTS short_link_clicks (
  id           TEXT PRIMARY KEY,
  short_link_id TEXT NOT NULL,
  country      TEXT NOT NULL DEFAULT '',
  device       TEXT NOT NULL DEFAULT 'other',
  referer_host TEXT NOT NULL DEFAULT '',
  clicked_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_short_link_clicks_link_clicked ON short_link_clicks(short_link_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_clicked ON short_link_clicks(clicked_at DESC);
