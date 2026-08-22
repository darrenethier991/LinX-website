-- Phase A: additive LINX Ecosystem foundation. No public-site behavior or external automation is activated by this schema.

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 2 AND 128),
  plan TEXT NOT NULL DEFAULT 'foundation' CHECK (plan IN ('foundation','starter','growth','unlimited','enterprise','white_label')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','administrator','member','auditor')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  added_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES platform_users(id),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_memberships_org ON organization_memberships(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user ON organization_memberships(user_id, status);

CREATE TABLE IF NOT EXISTS organization_modules (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  module_key TEXT NOT NULL CHECK (module_key IN ('identity','connect','flow','lens','exchange','vault','pulse','hub','market','agents')),
  lifecycle TEXT NOT NULL DEFAULT 'planned' CHECK (lifecycle IN ('planned','configured','paused')),
  configured_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  UNIQUE (organization_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_organization_modules_org ON organization_modules(organization_id, lifecycle);

CREATE TABLE IF NOT EXISTS user_consent_preferences (
  user_id TEXT PRIMARY KEY,
  consent_analytics INTEGER NOT NULL DEFAULT 0 CHECK (consent_analytics IN (0,1)),
  consent_personalization INTEGER NOT NULL DEFAULT 0 CHECK (consent_personalization IN (0,1)),
  consent_product_updates INTEGER NOT NULL DEFAULT 0 CHECK (consent_product_updates IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES platform_users(id)
);

CREATE TABLE IF NOT EXISTS organization_policy_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN ('data_retention','acceptable_use','agent_approval','access_control')),
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 120),
  policy_text TEXT NOT NULL CHECK (length(trim(policy_text)) BETWEEN 10 AND 8000),
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','published','retired')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_organization_policy_templates_org ON organization_policy_templates(organization_id, policy_type, state);

CREATE TABLE IF NOT EXISTS ecosystem_audit_events (
  id TEXT PRIMARY KEY,
  actor_ref TEXT NOT NULL,
  organization_id TEXT,
  event_type TEXT NOT NULL CHECK (length(event_type) BETWEEN 3 AND 80),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 3 AND 500),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_ecosystem_audit_events_created ON ecosystem_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ecosystem_audit_events_org ON ecosystem_audit_events(organization_id, created_at DESC);
