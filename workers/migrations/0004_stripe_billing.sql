-- Stripe customer links and idempotent webhook records for recurring LINX Services subscriptions.
CREATE TABLE IF NOT EXISTS stripe_customer_links (
  id TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES platform_users(id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_customer_links_user ON stripe_customer_links(user_id);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'failed', 'ignored')),
  last_error TEXT,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON stripe_webhook_events(status, received_at);

ALTER TABLE subscription_entitlements ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE subscription_entitlements ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE subscription_entitlements ADD COLUMN stripe_price_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscription_entitlements_stripe_subscription ON subscription_entitlements(stripe_subscription_id);
