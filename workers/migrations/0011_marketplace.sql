-- EchoForge marketplace: automation listings, bids, and orders.
-- price_cents NULL = bid-only / request-quote listing (no Buy Now).
-- seller_stripe_account_id set = Stripe Connect split (30% platform fee to LinX,
-- 70% transferred to seller). NULL = LinX collects the full amount directly.

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_name TEXT NOT NULL DEFAULT 'LinX',
  seller_email TEXT,
  seller_stripe_account_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_cents INTEGER,
  category TEXT NOT NULL DEFAULT 'automation',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'paused')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status, created_at);

CREATE TABLE IF NOT EXISTS marketplace_bids (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  bidder_name TEXT NOT NULL,
  bidder_email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_bids_listing ON marketplace_bids(listing_id, created_at);

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER NOT NULL,
  seller_amount_cents INTEGER NOT NULL,
  stripe_session_id TEXT,
  connect_destination TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_orders_session ON marketplace_orders(stripe_session_id);

-- Seed: the curated LinX workflow templates become bid-only listings (no fixed
-- price yet — buyers bid on implementation or request a quote).
INSERT INTO marketplace_listings (id, seller_name, title, description, price_cents, category, status) VALUES
('tpl-welcome-sms', 'LinX', 'Welcome SMS Sequence', 'A three-step customer intake pattern with explicit opt-out handling and a CRM handoff.', NULL, 'sms', 'active'),
('tpl-followup-scheduler', 'LinX', 'Follow-Up Scheduler', 'A structured follow-up cadence that keeps an owner informed when a lead needs a human response.', NULL, 'sms', 'active'),
('tpl-lead-qualifier', 'LinX', 'Lead Qualifier Bot', 'A configurable AI-assisted triage pattern for routing the right lead to the right operational queue.', NULL, 'ai', 'active'),
('tpl-feedback-request', 'LinX', 'Post-Job Feedback Request', 'A respectful post-completion feedback request pattern with clear timing and consent considerations.', NULL, 'review', 'active'),
('tpl-booking-confirm', 'LinX', 'Booking Confirmation Flow', 'An appointment confirmation and reminder pattern for reliable scheduling communication.', NULL, 'booking', 'active'),
('tpl-quote-drip', 'LinX', 'Quote Follow-Up Drip', 'A timed sequence for checking in after a quote, with straightforward pause and handoff points.', NULL, 'lead', 'active'),
('tpl-lead-alert', 'LinX', 'New Lead Alert System', 'A routing pattern for surfacing qualified new leads to the responsible operator by SMS or email.', NULL, 'lead', 'active'),
('tpl-ops-report', 'LinX', 'Monthly Operations Report', 'A reporting pattern for reviewing leads, close activity, referral sources, and operational notes.', NULL, 'analytics', 'active'),
('tpl-reengagement', 'LinX', 'Re-Engagement Sequence', 'A customer re-engagement pattern that keeps timing, consent, and the human handoff visible.', NULL, 'sms', 'active'),
('tpl-homeowner-onboarding', 'LinX', 'Homeowner Onboarding Flow', 'A project-brief collection and contractor-match notification pattern for homeowner intake.', NULL, 'booking', 'active'),
('tpl-urgent-routing', 'LinX', 'Urgent Request Routing', 'A priority-routing pattern that recognizes urgent service needs and directs them to an on-call owner.', NULL, 'ai', 'active'),
('tpl-referral-thanks', 'LinX', 'Referral Thank-You Flow', 'A referral acknowledgement pattern designed to keep source tracking and follow-up transparent.', NULL, 'review', 'active');
