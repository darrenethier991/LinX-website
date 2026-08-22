export const ECOSYSTEM_MODULES = Object.freeze(['identity', 'connect', 'flow', 'lens', 'exchange', 'vault', 'pulse', 'hub', 'market', 'agents']);
export const ORGANIZATION_PLANS = Object.freeze(['foundation', 'starter', 'growth', 'unlimited', 'enterprise', 'white_label']);
export const MEMBERSHIP_ROLES = Object.freeze(['owner', 'administrator', 'member', 'auditor']);
export const MODULE_LIFECYCLES = Object.freeze(['planned', 'configured', 'paused']);
export const POLICY_TYPES = Object.freeze(['data_retention', 'acceptable_use', 'agent_approval', 'access_control']);
export const POLICY_STATES = Object.freeze(['draft', 'published', 'retired']);

export function canAdministerEcosystem(identity) {
  return identity?.role === 'admin';
}

export function canManageOwnConsent(identity) {
  return identity?.role === 'subscriber' && typeof identity?.sub === 'string' && identity.sub.length > 0;
}

function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeId(value) {
  const id = text(value, 100);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

function enumValue(value, values, fallback) {
  const normalized = text(value, 64).toLowerCase();
  return values.includes(normalized) ? normalized : fallback;
}

export function normalizeOrganizationInput(body) {
  const name = text(body?.name, 128);
  if (name.length < 2) return { error: 'Organization name must contain at least 2 characters.' };
  const ownerUserId = body?.owner_user_id === undefined || body?.owner_user_id === null || body?.owner_user_id === '' ? '' : safeId(body.owner_user_id);
  if (body?.owner_user_id && !ownerUserId) return { error: 'Choose a valid existing platform user as the organization owner.' };
  return { name, plan: enumValue(body?.plan, ORGANIZATION_PLANS, 'foundation'), ownerUserId };
}

export function normalizeMembershipInput(body) {
  const userId = safeId(body?.user_id);
  if (!userId) return { error: 'Choose a valid existing platform user.' };
  return { userId, role: enumValue(body?.role, MEMBERSHIP_ROLES, 'member') };
}

export function normalizeModuleConfiguration(moduleKey, body) {
  const key = text(moduleKey, 64).toLowerCase();
  if (!ECOSYSTEM_MODULES.includes(key)) return { error: 'Unknown LINX module.' };
  return { moduleKey: key, lifecycle: enumValue(body?.lifecycle, MODULE_LIFECYCLES, 'planned') };
}

export function normalizePolicyInput(body) {
  const organizationId = safeId(body?.organization_id);
  const type = enumValue(body?.policy_type, POLICY_TYPES, '');
  const title = text(body?.title, 120);
  const policyText = text(body?.policy_text, 8000);
  const state = enumValue(body?.state, POLICY_STATES, 'draft');
  if (!organizationId) return { error: 'Choose an organization for this policy.' };
  if (!type) return { error: 'Choose a valid policy type.' };
  if (title.length < 3) return { error: 'Policy title must contain at least 3 characters.' };
  if (policyText.length < 10) return { error: 'Policy text must contain at least 10 characters.' };
  return { organizationId, type, title, policyText, state };
}

export function normalizeConsentPreferences(body, current = {}) {
  const fields = ['consent_analytics', 'consent_personalization', 'consent_product_updates'];
  const result = {};
  for (const field of fields) {
    const incoming = body?.[field];
    if (incoming === undefined) result[field] = Number(current?.[field] || 0) === 1;
    else if (typeof incoming === 'boolean') result[field] = incoming;
    else return { error: `${field} must be true or false.` };
  }
  return result;
}

export function consentView(row = {}) {
  return {
    consent_analytics: Number(row.consent_analytics || 0) === 1,
    consent_personalization: Number(row.consent_personalization || 0) === 1,
    consent_product_updates: Number(row.consent_product_updates || 0) === 1,
    updated_at: row.updated_at || null,
  };
}
