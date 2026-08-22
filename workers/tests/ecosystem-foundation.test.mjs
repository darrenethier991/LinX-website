import test from 'node:test';
import assert from 'node:assert/strict';
import { canAdministerEcosystem, canManageOwnConsent, consentView, normalizeConsentPreferences, normalizeMembershipInput, normalizeModuleConfiguration, normalizeOrganizationInput, normalizePolicyInput } from '../api/ecosystem-foundation.js';

test('ecosystem organization and membership inputs remain bounded to existing-account identifiers', () => {
  assert.equal(normalizeOrganizationInput({ name: 'Northline Mechanical', plan: 'growth', owner_user_id: '123e4567-e89b-12d3-a456-426614174000' }).name, 'Northline Mechanical');
  assert.match(normalizeOrganizationInput({ name: 'x' }).error, /at least 2/i);
  assert.match(normalizeMembershipInput({ user_id: 'not-an-id' }).error, /valid existing/i);
  assert.deepEqual(normalizeMembershipInput({ user_id: '123e4567-e89b-12d3-a456-426614174000', role: 'administrator' }), { userId: '123e4567-e89b-12d3-a456-426614174000', role: 'administrator' });
});

test('ecosystem module registry tracks planning state without accepting unknown modules', () => {
  assert.deepEqual(normalizeModuleConfiguration('agents', { lifecycle: 'configured' }), { moduleKey: 'agents', lifecycle: 'configured' });
  assert.match(normalizeModuleConfiguration('payments', { lifecycle: 'configured' }).error, /unknown/i);
  assert.equal(normalizeModuleConfiguration('market', { lifecycle: 'live' }).lifecycle, 'planned');
});

test('ecosystem policy and consent inputs reject unsafe shapes and preserve omitted values', () => {
  assert.equal(normalizePolicyInput({ organization_id: '123e4567-e89b-12d3-a456-426614174000', policy_type: 'agent_approval', title: 'Human approval', policy_text: 'External actions require approval.', state: 'draft' }).type, 'agent_approval');
  assert.match(normalizePolicyInput({ organization_id: '123e4567-e89b-12d3-a456-426614174000', policy_type: 'agent_approval', title: 'No', policy_text: 'short' }).error, /at least/i);
  assert.deepEqual(normalizeConsentPreferences({ consent_analytics: true }, { consent_analytics: 0, consent_personalization: 1, consent_product_updates: 0 }), { consent_analytics: true, consent_personalization: true, consent_product_updates: false });
  assert.match(normalizeConsentPreferences({ consent_analytics: 'yes' }).error, /true or false/i);
  assert.deepEqual(consentView({ consent_analytics: 1, consent_personalization: 0, consent_product_updates: 1, updated_at: '2026-08-22T00:00:00Z' }), { consent_analytics: true, consent_personalization: false, consent_product_updates: true, updated_at: '2026-08-22T00:00:00Z' });
});

test('ecosystem access is administrator-only while personal consent stays bound to a subscriber identity', () => {
  assert.equal(canAdministerEcosystem({ role: 'admin', sub: 'admin@example.test' }), true);
  assert.equal(canAdministerEcosystem({ role: 'subscriber', sub: 'user-id' }), false);
  assert.equal(canManageOwnConsent({ role: 'subscriber', sub: 'user-id' }), true);
  assert.equal(canManageOwnConsent({ role: 'subscriber' }), false);
  assert.equal(canManageOwnConsent({ role: 'admin', sub: 'admin@example.test' }), false);
});
