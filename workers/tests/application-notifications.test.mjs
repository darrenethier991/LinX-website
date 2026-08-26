import assert from 'node:assert/strict';
import test from 'node:test';
import { ownerApplicationEmailPayload, reconcileOwnerApplicationNotifications } from '../api/application-notifications.js';

const application = {
  id: 'application-123',
  display_name: 'Avery Smith',
  business_name: 'North Line Roofing',
  trade: 'Roofing',
  city: 'Barrie',
  email: 'avery@example.com',
};

test('owner-only application email remains disabled until the full secure Resend configuration is present', () => {
  assert.equal(ownerApplicationEmailPayload({}, application), null);
  assert.equal(ownerApplicationEmailPayload({ APPLICATION_NOTIFICATION_ENABLED: 'true', RESEND_API_KEY: 'test-key', RESEND_FROM_EMAIL: 'LINX <notifications@linxservices.ca>' }, application), null);
});

test('owner-only application email targets the configured owner and includes application review context', () => {
  const payload = ownerApplicationEmailPayload({
    APPLICATION_NOTIFICATION_ENABLED: 'true',
    RESEND_API_KEY: 'test-key',
    RESEND_FROM_EMAIL: 'LINX <notifications@linxservices.ca>',
    OWNER_NOTIFICATION_EMAIL: 'owner@linxservices.ca',
  }, application);
  assert.equal(payload.email.to[0], 'owner@linxservices.ca');
  assert.match(payload.email.subject, /new contractor application/i);
  assert.match(payload.email.text, /North Line Roofing/);
  assert.match(payload.email.text, /avery@example.com/);
  assert.doesNotMatch(payload.email.text, /SMS|welcome/i);
});

test('stored application reconciliation does not query or send while owner email delivery is disabled', async () => {
  let queried = false;
  const result = await reconcileOwnerApplicationNotifications({
    APPLICATION_NOTIFICATION_ENABLED: 'false',
    DB: { prepare() { queried = true; throw new Error('must not query while disabled'); } },
  });
  assert.deepEqual(result, { status: 'disabled', processed: 0 });
  assert.equal(queried, false);
});
