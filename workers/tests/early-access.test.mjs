import test from 'node:test';
import assert from 'node:assert/strict';
import { LAUNCH_SIX_OFFER, launchOfferView, normalizeLaunchEarlyAccessApplication } from '../api/early-access.js';

test('Launch Six early access requires real contact context and candid-feedback acknowledgement', () => {
  assert.match(normalizeLaunchEarlyAccessApplication({}).error, /valid email/i);
  assert.match(normalizeLaunchEarlyAccessApplication({ email: 'owner@example.com', display_name: 'A', business_name: 'B', trade: 'Roofing', city: 'Barrie' }).error, /candid product feedback/i);
  assert.deepEqual(normalizeLaunchEarlyAccessApplication({ email: ' Owner@Example.COM ', display_name: '  Avery  Smith ', business_name: ' North Line Roofing ', trade: ' Roofing ', city: ' Barrie ', feedback_commitment: true, testimonial_permission: false }), {
    email: 'owner@example.com', display_name: 'Avery Smith', business_name: 'North Line Roofing', trade: 'Roofing', city: 'Barrie', feedback_commitment: true, testimonial_permission: false,
  });
});

test('Launch Six offer is capped, time-bounded, and never treats feedback as testimonial permission', () => {
  assert.equal(LAUNCH_SIX_OFFER.max_redemptions, 6);
  assert.equal(LAUNCH_SIX_OFFER.duration_days, 60);
  assert.equal(launchOfferView().testimonial_publication, 'separate_explicit_permission_required');
});
