import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { getStripePlan, mapStripeSubscriptionStatus, verifyStripeWebhookSignature } from "../api/index.js";

test("Stripe plan lookup permits only configured LINX subscription tiers", () => {
  const env = { STRIPE_PRICE_STARTER: "price_starter", STRIPE_PRICE_GROWTH: "price_growth", STRIPE_PRICE_UNLIMITED: "price_unlimited" };
  assert.deepEqual(getStripePlan(env, "GROWTH"), { key: "growth", entitlementTier: "growth", label: "Growth", priceBinding: "STRIPE_PRICE_GROWTH", priceId: "price_growth" });
  assert.deepEqual(getStripePlan(env, "unlimited_trial"), { key: "unlimited_trial", entitlementTier: "unlimited", label: "Unlimited Trial", priceBinding: "STRIPE_PRICE_UNLIMITED", trialDays: 2, priceId: "price_unlimited" });
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
