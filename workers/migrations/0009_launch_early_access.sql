-- LINX Launch Six: truthful early-access applications for the capped Stripe promotion.
CREATE TABLE IF NOT EXISTS launch_early_access_applications (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  trade TEXT NOT NULL,
  city TEXT NOT NULL,
  feedback_commitment INTEGER NOT NULL CHECK (feedback_commitment IN (0, 1)),
  testimonial_permission INTEGER NOT NULL DEFAULT 0 CHECK (testimonial_permission IN (0, 1)),
  promotion_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'redeemed', 'waitlisted', 'withdrawn')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_launch_early_access_status_created
  ON launch_early_access_applications(status, created_at DESC);
