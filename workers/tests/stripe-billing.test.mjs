import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { getStripePlan, mapStripeSubscriptionStatus, verifyStripeWebhookSignature } from "../api/index.js";

test("Stripe plan lookup permits only configured LINX subscription tiers", () => {
  const env = { STRIPE_PRICE_STARTER: "price_starter", STRIPE_PRICE_PRO: "price_pro", STRIPE_PRICE_ENTERPRISE: "price_enterprise" };
  assert.deepEqual(getStripePlan(env, "PRO"), { key: "pro", label: "Pro", priceBinding: "STRIPE_PRICE_PRO", priceId: "price_pro" });
  assert.equal(getStripePlan(env, "free"), null);
  assert.equal(getStripePlan({}, "starter"), null);
});

test("Stripe subscription status mapping never treats unpaid or incomplete states as active", () => {
  assert.equal(mapStripeSubscriptionStatus("active"), "active");
  assert.equal(mapStripeSubscriptionStatus("past_due"), "paused");
  assert.equal(mapStripeSubscriptionStatus("incomplete"), "pending");
  assert.equal(mapStripeSubscriptionStatus("unpaid"), "cancelled");
});

test("Stripe webhook verification requires a current signed raw payload", async () => {
  const rawBody = '{"id":"evt_example","type":"checkout.session.completed"}';
  const timestamp = 1_700_000_000;
  const secret = "whsec_example";
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  assert.equal(await verifyStripeWebhookSignature(rawBody, `t=${timestamp},v1=${signature}`, secret, timestamp + 10), true);
  assert.equal(await verifyStripeWebhookSignature(rawBody, `t=${timestamp},v1=not-valid`, secret, timestamp + 10), false);
  assert.equal(await verifyStripeWebhookSignature(rawBody, `t=${timestamp},v1=${signature}`, secret, timestamp + 301), false);
});
