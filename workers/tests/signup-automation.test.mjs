import assert from "node:assert/strict";
import test from "node:test";
import { buildWelcomeMessage, isE164, normalizeSubscriberInput, processApprovalAutomation } from "../api/signup-automation.js";

test("subscriber phone and consent normalization requires E.164 format and an explicit source", () => {
  assert.equal(isE164("+14165550123"), true);
  assert.equal(isE164("4165550123"), false);
  assert.throws(() => normalizeSubscriberInput({ phone_e164: "+14165550123", sms_consent: true }), /consent source/);
  assert.deepEqual(normalizeSubscriberInput({ phone_e164: "+14165550123", company: "LINX Test", sms_consent: true, sms_consent_source: "admin-recorded-v1" }), {
    phone_e164: "+14165550123", company: "LINX Test", sms_consent: true, sms_consent_source: "admin-recorded-v1",
  });
});

test("welcome SMS identifies LINX Services and includes the approved opt-out instruction", () => {
  const message = buildWelcomeMessage("Alex Morgan");
  assert.match(message, /^LINX Services: Welcome, Alex\./);
  assert.match(message, /Reply STOP to unsubscribe\.$/);
});

test("approval automation never calls external services while the production switch is disabled", async () => {
  const result = await processApprovalAutomation({ AUTOMATION_ENABLED: "false" }, { id: "user-1", email: "alex@example.ca" });
  assert.deepEqual(result, { enabled: false, sheet_sync: "disabled", owner_notification: "disabled", welcome_sms: "disabled" });
});
