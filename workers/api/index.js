import {
  completeAdminChat,
  completePublicChat,
  normalizeMessages,
  responseEnvelope,
} from "./clam-code.js";
import { normalizeImportedLead, normalizeLeadSourceInput, parseApprovedFeed, sourceReadiness } from "./lead-pipeline.js";
import { runPassiveDomainObservation } from "./passive-osint.js";
import { enhancePrompt, normalizePromptEnhancementInput } from "./prompt-enhancer.js";
import { deviceCategory, generatedSlug, normalizeShortLinkInput, refererHost } from "./short-links.js";
import { normalizeSubscriberInput, processApprovalAutomation, verifyTwilioStatusCallback } from "./signup-automation.js";

/**
 * LinX API — Cloudflare Worker
 * ─────────────────────────────────────────────────────────────────────────────
 * Serves all /_api_* and /api/* endpoints consumed by:
 *   • The React Admin Dashboard (Cloudflare Pages)
 *   • The legacy crawler-dashboard.html (static HTML)
 *   • The Express server (which still runs the background crawler and POSTs
 *     new leads here via POST /api/leads/ingest)
 *
 * Required Worker bindings (set in wrangler.jsonc):
 *   env.DB              — D1 database (linx-db)
 *   env.ADMIN_USERNAME  — var  (plain text)
 *   env.ADMIN_PASSWORD_HASH — var  (SHA-256 hex of the admin password)
 *   env.JWT_SECRET      — secret (random 32+ byte hex string)
 *
 * Authentication
 * ──────────────
 * Uses HMAC-SHA-256 JWTs (Web Crypto API — no external libraries needed).
 * Token format: base64url(header).base64url(payload).base64url(signature)
 * Tokens expire after 30 minutes.
 *
 * Password hashing
 * ─────────────────
 * The Worker cannot run bcrypt. ADMIN_PASSWORD_HASH must be the SHA-256 hex
 * digest of the admin password (not bcrypt). Generate it with:
 *   node -e "const c=require('crypto');console.log(c.createHash('sha256').update('yourpassword').digest('hex'))"
 *
 * The Express server continues to use bcrypt for its own /api/auth/login route.
 * The Worker is accessed only by the React SPA and direct API calls.
 *
 * CORS
 * ─────
 * Allowed origins: linxservices.ca, *.linxservices.ca, localhost:*, 127.0.0.1:*
 */

// ─── Utility: base64url ───────────────────────────────────────────────────────

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    str.length + (4 - (str.length % 4)) % 4, '='
  );
  const bin = atob(padded);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

// ─── HMAC-SHA-256 JWT helpers ─────────────────────────────────────────────────

async function jwtSign(payload, secret) {
  const header  = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body    = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key     = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

async function jwtVerify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC', key,
    b64urlDecode(sig),
    new TextEncoder().encode(`${header}.${body}`)
  );
  if (!valid) return null;
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;
  return payload;
}

// ─── SHA-256 hex (for password comparison) ───────────────────────────────────

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── UUID v4 ─────────────────────────────────────────────────────────────────

function uuidv4() {
  return crypto.randomUUID();
}

// ─── CORS helpers ─────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allowed = /^https?:\/\/(linxservices\.ca|[a-z0-9-]+\.linxservices\.ca|localhost(:\d+)?|127\.0\.0\.1(:\d+)?)$/;
  const allow   = allowed.test(origin || '') ? origin : 'https://linxservices.ca';
  return {
    'Access-Control-Allow-Origin'      : allow,
    'Access-Control-Allow-Methods'     : 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers'     : 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials' : 'true',
  };
}

function json(obj, status = 200, origin = '') {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function requestId() {
  return crypto.randomUUID();
}

function createAccessCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
}

function validSubscriptionStatus(value) {
  return ['pending', 'approved', 'active', 'paused', 'cancelled', 'expired'].includes(value);
}

function validUserStatus(value) {
  return ['active', 'suspended', 'invited'].includes(value);
}

async function recordAiUsage(env, event) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(`
      INSERT INTO ai_usage_events (id,request_id,role,provider,model,input_messages,input_characters,output_characters,input_tokens,output_tokens,total_tokens,cost,status,latency_ms)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(
      requestId(), event.requestId, event.role, event.provider, event.model,
      event.inputMessages, event.inputCharacters, event.outputCharacters,
      event.usage?.input_tokens ?? null, event.usage?.output_tokens ?? null,
      event.usage?.total_tokens ?? null, event.usage?.cost ?? null,
      event.status, event.latencyMs,
    ).run();
  } catch (error) {
    console.warn("[Clam Code] Usage event was not recorded", error?.message || error);
  }
}

async function getPlatformSnapshot(env) {
  const unavailable = { available: false, reason: "Analytics storage is not configured." };
  if (!env.DB) return unavailable;
  try {
    const [users, subscriptions, pages, ai] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS n FROM platform_users").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM subscription_entitlements WHERE status IN ('approved','active')").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM page_events WHERE created_at >= datetime('now','-30 day')").first(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM ai_usage_events WHERE created_at >= datetime('now','-30 day')").first(),
    ]);
    return {
      available: true,
      users: users?.n || 0,
      active_subscriptions: subscriptions?.n || 0,
      page_visits_30d: pages?.n || 0,
      ai_requests_30d: ai?.n || 0,
    };
  } catch (error) {
    return unavailable;
  }
}

async function getAdminClamContext(env) {
  const overview = await getPlatformSnapshot(env);
  if (!env.DB || !overview.available) return overview;
  try {
    const [tiers, statuses, popularPaths] = await Promise.all([
      env.DB.prepare("SELECT tier, COUNT(*) AS count FROM subscription_entitlements GROUP BY tier ORDER BY count DESC LIMIT 12").all(),
      env.DB.prepare("SELECT status, COUNT(*) AS count FROM subscription_entitlements GROUP BY status ORDER BY count DESC").all(),
      env.DB.prepare("SELECT path, COUNT(*) AS count FROM page_events WHERE created_at >= datetime('now','-30 day') GROUP BY path ORDER BY count DESC LIMIT 8").all(),
    ]);
    return {
      ...overview,
      subscriptions_by_tier: tiers.results || [],
      subscriptions_by_status: statuses.results || [],
      top_pages_30d: popularPaths.results || [],
    };
  } catch (error) {
    console.warn("[Clam Code] Administrator context details were unavailable", error?.message || error);
    return overview;
  }
}

const STRIPE_PLANS = Object.freeze({
  starter: { label: 'Starter', priceBinding: 'STRIPE_PRICE_STARTER' },
  growth: { label: 'Growth', priceBinding: 'STRIPE_PRICE_GROWTH' },
  unlimited: { label: 'Unlimited', priceBinding: 'STRIPE_PRICE_UNLIMITED' },
  unlimited_trial: { label: 'Unlimited Trial', priceBinding: 'STRIPE_PRICE_UNLIMITED', entitlementTier: 'unlimited', trialDays: 2 },
});

export function getStripePlan(env, plan) {
  const key = typeof plan === 'string' ? plan.trim().toLowerCase() : '';
  const configured = STRIPE_PLANS[key];
  if (!configured) return null;
  const priceId = String(env?.[configured.priceBinding] || '').trim();
  return priceId ? { key, entitlementTier: configured.entitlementTier || key, ...configured, priceId } : null;
}

export function mapStripeSubscriptionStatus(status) {
  if (['active', 'trialing'].includes(status)) return 'active';
  if (['past_due', 'paused'].includes(status)) return 'paused';
  if (['canceled', 'unpaid', 'incomplete_expired'].includes(status)) return 'cancelled';
  return 'pending';
}

function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^\S+@\S+\.\S+$/.test(email) ? email : '';
}

function unixSecondsToIso(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0
    ? new Date(Number(value) * 1000).toISOString()
    : null;
}

async function hmacSha256Hex(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function safeStringEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
}

export async function verifyStripeWebhookSignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!rawBody || !header || !secret) return false;
  const values = header.split(',').reduce((result, part) => {
    const [key, value] = part.split('=', 2);
    if (key && value) (result[key] ||= []).push(value);
    return result;
  }, {});
  const timestamp = Number(values.t?.[0]);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > 300) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return (values.v1 || []).some(signature => safeStringEqual(signature, expected));
}

async function stripeRequest(env, path, { method = 'GET', form = null } = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.');
  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: form ? form.toString() : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || 'Stripe rejected the request.');
  return payload;
}

async function createStripeCheckoutSession(env, requestedPlan) {
  const plan = getStripePlan(env, requestedPlan);
  if (!plan) throw new Error('The selected subscription plan is unavailable.');
  const form = new URLSearchParams();
  form.set('mode', 'subscription');
  form.set('line_items[0][price]', plan.priceId);
  form.set('line_items[0][quantity]', '1');
  form.append('payment_method_types[]', 'card');
  form.set('allow_promotion_codes', 'true');
  form.set('metadata[linx_tier]', plan.entitlementTier);
  form.set('metadata[linx_checkout_plan]', plan.key);
  form.set('subscription_data[metadata][linx_tier]', plan.entitlementTier);
  if (plan.trialDays) form.set('subscription_data[trial_period_days]', String(plan.trialDays));
  form.set('success_url', env.STRIPE_SUCCESS_URL || 'https://linxservices.ca/checkout-success.html?session_id={CHECKOUT_SESSION_ID}');
  form.set('cancel_url', env.STRIPE_CANCEL_URL || 'https://linxservices.ca/checkout-cancel.html');
  const session = await stripeRequest(env, '/v1/checkout/sessions', { method: 'POST', form });
  if (!session?.url) throw new Error('Stripe did not return a checkout URL.');
  return { plan, session };
}

async function getOrCreateStripeUser(env, { email, customerId }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !customerId) return null;
  let user = await env.DB.prepare('SELECT id, email FROM platform_users WHERE email = ?').bind(normalizedEmail).first();
  if (!user) {
    const userId = requestId();
    await env.DB.prepare("INSERT INTO platform_users (id,email,display_name,role,status) VALUES (?,?,?,?,?)")
      .bind(userId, normalizedEmail, '', 'subscriber', 'active').run();
    user = { id: userId, email: normalizedEmail };
  } else {
    await env.DB.prepare("UPDATE platform_users SET status = 'active', updated_at = datetime('now') WHERE id = ?").bind(user.id).run();
  }
  await env.DB.prepare(`
    INSERT INTO stripe_customer_links (id,stripe_customer_id,user_id,email,updated_at)
    VALUES (?,?,?,?,datetime('now'))
    ON CONFLICT(stripe_customer_id) DO UPDATE SET user_id = excluded.user_id, email = excluded.email, updated_at = datetime('now')
  `).bind(requestId(), customerId, user.id, normalizedEmail).run();
  return user;
}

async function upsertStripeEntitlement(env, { userId, tier, status, customerId, subscriptionId, priceId, endsAt = null }) {
  if (!userId || !subscriptionId) return;
  const current = await env.DB.prepare('SELECT id FROM subscription_entitlements WHERE stripe_subscription_id = ? LIMIT 1').bind(subscriptionId).first();
  if (current) {
    await env.DB.prepare(`
      UPDATE subscription_entitlements
      SET tier = ?, status = ?, stripe_customer_id = ?, stripe_price_id = ?, ends_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(tier, status, customerId || null, priceId || null, endsAt, current.id).run();
    return;
  }
  await env.DB.prepare(`
    INSERT INTO subscription_entitlements (id,user_id,tier,status,source,starts_at,ends_at,stripe_customer_id,stripe_subscription_id,stripe_price_id)
    VALUES (?,?,?,?,?,datetime('now'),?,?,?,?)
  `).bind(requestId(), userId, tier, status, 'stripe', endsAt, customerId || null, subscriptionId, priceId || null).run();
}

async function processStripeEvent(env, event) {
  const object = event?.data?.object || {};
  if (event.type === 'checkout.session.completed') {
    const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
    const email = object.customer_details?.email || object.customer_email;
    const user = await getOrCreateStripeUser(env, { email, customerId });
    if (!user || !subscriptionId) return { status: 'ignored', reason: 'Checkout event did not include a usable customer email and subscription.' };
    const tier = getStripePlan(env, object.metadata?.linx_tier)?.key || String(object.metadata?.linx_tier || 'subscriber').slice(0, 80);
    const priceId = getStripePlan(env, tier)?.priceId || null;
    const entitlementStatus = object.payment_status === 'paid' ? 'active' : 'pending';
    await upsertStripeEntitlement(env, { userId: user.id, tier, status: entitlementStatus, customerId, subscriptionId, priceId });
    return { status: 'processed' };
  }

  const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id || object.id;
  if (!subscriptionId) return { status: 'ignored', reason: 'Subscription identifier was not present.' };
  const entitlement = await env.DB.prepare('SELECT id, user_id, tier, stripe_price_id FROM subscription_entitlements WHERE stripe_subscription_id = ? LIMIT 1').bind(subscriptionId).first();
  if (!entitlement) return { status: 'ignored', reason: 'Subscription is not yet linked to a LINX entitlement.' };

  if (event.type === 'invoice.paid') {
    const period = object.lines?.data?.[0]?.period?.end || object.period_end;
    await upsertStripeEntitlement(env, { userId: entitlement.user_id, tier: entitlement.tier, status: 'active', customerId: object.customer, subscriptionId, priceId: entitlement.stripe_price_id, endsAt: unixSecondsToIso(period) });
    return { status: 'processed' };
  }
  if (event.type === 'invoice.payment_failed') {
    await upsertStripeEntitlement(env, { userId: entitlement.user_id, tier: entitlement.tier, status: 'paused', customerId: object.customer, subscriptionId, priceId: entitlement.stripe_price_id });
    return { status: 'processed' };
  }
  if (['customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
    const stripeStatus = event.type === 'customer.subscription.deleted' ? 'canceled' : object.status;
    await upsertStripeEntitlement(env, { userId: entitlement.user_id, tier: entitlement.tier, status: mapStripeSubscriptionStatus(stripeStatus), customerId: object.customer, subscriptionId, priceId: entitlement.stripe_price_id, endsAt: unixSecondsToIso(object.current_period_end || object.cancel_at) });
    return { status: 'processed' };
  }
  return { status: 'ignored', reason: 'Event type is not handled.' };
}

async function processVerifiedStripeEvent(env, event) {
  const existing = await env.DB.prepare('SELECT status FROM stripe_webhook_events WHERE stripe_event_id = ?').bind(event.id).first();
  if (existing?.status === 'processed' || existing?.status === 'ignored') return { duplicate: true, status: existing.status };
  if (existing) {
    await env.DB.prepare("UPDATE stripe_webhook_events SET status = 'processing', last_error = NULL WHERE stripe_event_id = ?").bind(event.id).run();
  } else {
    await env.DB.prepare('INSERT INTO stripe_webhook_events (stripe_event_id,event_type,status) VALUES (?,?,?)').bind(event.id, event.type, 'processing').run();
  }
  try {
    const result = await processStripeEvent(env, event);
    await env.DB.prepare("UPDATE stripe_webhook_events SET status = ?, processed_at = datetime('now'), last_error = NULL WHERE stripe_event_id = ?")
      .bind(result.status, event.id).run();
    return result;
  } catch (error) {
    await env.DB.prepare("UPDATE stripe_webhook_events SET status = 'failed', last_error = ? WHERE stripe_event_id = ?")
      .bind(String(error?.message || 'Stripe event processing failed').slice(0, 500), event.id).run();
    throw error;
  }
}

async function recordPageView(env, body) {
  if (!env.DB) return;
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : "/";
  try {
    await env.DB.prepare("INSERT INTO page_events (id,path,event_type,role) VALUES (?,?,?,?)")
      .bind(requestId(), path, "page_view", "public").run();
  } catch (error) {
    console.warn("[Analytics] Page event was not recorded", error?.message || error);
  }
}

// ─── Lead classifier (ported from leads/classifier.js) ───────────────────────

const CATEGORIES = {
  plumbing        : [['plumb',2],['pipe',2],['drain',2],['leak',2],['faucet',2],['toilet',2],['water heater',2],['sewer',2],['clog',2],['waterline',2],['tap',1],['sink',1],['shower',1],['bathtub',1],['backflow',2],['sump pump',2],['water pressure',1]],
  electrical      : [['electric',2],['electrical',2],['wiring',2],['panel',2],['outlet',2],['breaker',2],['circuit',2],['voltage',2],['light fixture',2],['ceiling fan',1],['generator',1],['rewire',2],['fuse',1],['socket',1],['grounding',2],['ev charger',2],['smart switch',1]],
  roofing         : [['roof',2],['shingle',2],['gutter',2],['eave',2],['soffit',2],['fascia',2],['flashing',2],['skylight',2],['flat roof',2],['leak roof',2],['attic',1],['chimney',1],['downspout',1],['metal roof',2],['tile roof',2]],
  hvac            : [['hvac',2],['furnace',2],['air condition',2],['ac unit',2],['heat pump',2],['ductwork',2],['ventilation',2],['boiler',2],['thermostat',2],['vent',1],['heating',1],['cooling',1],['air filter',1],['mini split',2],['radiant heat',2]],
  landscaping     : [['landscap',2],['lawn',2],['garden',2],['mow',2],['grass',2],['sod',2],['irrigation',2],['sprinkler',2],['mulch',2],['trim',1],['hedge',1],['tree',1],['shrub',1],['weed',1],['snow removal',2],['driveway snow',2],['leaf',1]],
  renovation      : [['renovate',2],['renovation',2],['remodel',2],['basement',2],['kitchen reno',2],['bathroom reno',2],['addition',2],['drywall',2],['flooring',2],['tile',1],['painting',1],['deck',2],['fence',2],['siding',2],['stucco',1],['framing',2],['insulation',2]],
  cleaning        : [['clean',2],['pressure wash',2],['power wash',2],['window clean',2],['carpet clean',2],['duct clean',2],['deep clean',2],['janitorial',2],['house clean',1],['maid',1]],
  painting        : [['paint',2],['stain',2],['varnish',2],['primer',2],['interior paint',2],['exterior paint',2],['spray paint',2],['wallpaper',2],['refinish',1]],
  moving          : [['moving',2],['mover',2],['relocation',2],['storage',1],['pack',1],['unpack',1],['furniture move',2],['haul',1]],
  pest_control    : [['pest',2],['exterminator',2],['bug',2],['rodent',2],['mice',2],['rat',2],['ant',1],['cockroach',2],['bedbug',2],['wasp',1],['termite',2],['wildlife removal',2]],
  appliance_repair: [['appliance',2],['washer',2],['dryer',2],['dishwasher',2],['refrigerator',2],['fridge',2],['stove',2],['oven',2],['microwave',1],['freezer',2],['repair appliance',2]],
  locksmith       : [['locksmith',2],['lock',2],['key',1],['deadbolt',2],['lockout',2],['rekey',2],['door lock',2],['safe',1]],
};

function classifyLead(text) {
  if (!text) return { category: 'general', score: 0 };
  const lower = text.toLowerCase();
  const scores = {};
  for (const [cat, kws] of Object.entries(CATEGORIES)) {
    let s = 0;
    for (const [kw, w] of kws) if (lower.includes(kw)) s += w;
    scores[cat] = s;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 1 ? { category: best[0], score: best[1] } : { category: 'general', score: 0 };
}

function getCategories() {
  return Object.keys(CATEGORIES).sort();
}

// ─── Deduplication (Jaccard, ported from leads/deduplicator.js) ───────────────

const STOP_WORDS = new Set(['a','an','the','and','or','but','in','on','at','to','for','of','with','i','we','my','our','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','looking','need','wanted','anyone','can','help','please','hi','hello']);

function normalise(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w)).join(' ');
}

function jaccardSim(a, b) {
  const sa = new Set(a.split(/\s+/).filter(Boolean));
  const sb = new Set(b.split(/\s+/).filter(Boolean));
  if (!sa.size && !sb.size) return 1;
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

async function buildHash(lead) {
  const key = `${(lead.source_url || '').trim()}|${normalise(lead.title || '')}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
}

// Check D1 for duplicate: exact hash or fuzzy within same city / 72 h window
async function isDuplicate(DB, lead, contentHash) {
  // 1. Exact hash
  const exact = await DB.prepare('SELECT id FROM leads WHERE content_hash = ?').bind(contentHash).first();
  if (exact) return { isDuplicate: true, reason: 'exact_hash' };

  // 2. Fuzzy: recent same-city leads
  const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const pool = await DB.prepare(
    "SELECT title, description FROM leads WHERE city = ? AND posted_at >= ? LIMIT 200"
  ).bind(lead.city || '', cutoff).all();

  const candidateNorm = normalise(`${lead.title} ${lead.description}`);
  for (const r of (pool.results || [])) {
    const existingNorm = normalise(`${r.title} ${r.description}`);
    if (jaccardSim(candidateNorm, existingNorm) >= 0.72) {
      return { isDuplicate: true, reason: 'fuzzy' };
    }
  }
  return { isDuplicate: false };
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function requireAuth(request, env) {
  const auth  = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  return jwtVerify(token, env.JWT_SECRET);
}

// ─── Body reader ──────────────────────────────────────────────────────────────

async function readBody(req) {
  try { return await req.json(); } catch { return {}; }
}

function sourceView(row) {
  if (!row) return null;
  let mapping = {};
  try { mapping = JSON.parse(row.field_mapping || '{}'); } catch (_) { mapping = {}; }
  return { ...row, has_owner_permission: Boolean(row.has_owner_permission), robots_allows_crawl: Boolean(row.robots_allows_crawl), field_mapping: mapping, readiness: sourceReadiness(row) };
}

async function writeImportRun(env, run) {
  await env.DB.prepare(`
    INSERT INTO lead_import_runs (id,source_id,import_mode,status,received,valid,added,duplicates,rejected,errors,created_by,completed_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
  `).bind(run.id, run.sourceId, run.importMode, run.status, run.received, run.valid, run.added, run.duplicates, run.rejected, JSON.stringify(run.errors || []), run.createdBy || '').run();
}

async function importLeadRows(env, source, rows, mapping, importMode, createdBy) {
  const run = { id: requestId(), sourceId: source.id, importMode, status: 'completed', received: Math.min(Array.isArray(rows) ? rows.length : 0, 100), valid: 0, added: 0, duplicates: 0, rejected: 0, errors: [], createdBy };
  const resolvedMapping = mapping && typeof mapping === 'object' ? mapping : (() => { try { return JSON.parse(source.field_mapping || '{}'); } catch (_) { return {}; } })();
  for (const raw of (Array.isArray(rows) ? rows : []).slice(0, 100)) {
    const normalized = normalizeImportedLead(raw, resolvedMapping);
    if (normalized.error) { run.rejected++; run.errors.push(normalized.error); continue; }
    run.valid++;
    const now = new Date().toISOString();
    const { category, score } = classifyLead(`${normalized.title} ${normalized.jobType} ${normalized.description}`);
    const duplicateKey = `${source.id}|${normalized.address.toLowerCase()}|${normalized.contact.toLowerCase()}|${normalized.title.toLowerCase()}`;
    const contentHash = await sha256hex(duplicateKey);
    const lead = {
      id: uuidv4(), title: normalized.title, description: normalized.description, source_url: normalized.sourceUrl,
      source_platform: source.name, posted_at: now, scraped_at: now, category, category_score: score,
      city: normalized.city, province: normalized.province, postal_code: normalized.postalCode,
      contact_method: normalized.contact.slice(0, 320), status: 'active', claimed_by: null,
      raw: JSON.stringify({ name: normalized.name, address: normalized.address, contact: normalized.contact, job_type: normalized.jobType, notes: normalized.description }).slice(0, 2000),
    };
    const duplicate = await isDuplicate(env.DB, lead, contentHash);
    if (duplicate.isDuplicate) { run.duplicates++; continue; }
    await env.DB.prepare(`
      INSERT INTO leads (id,content_hash,title,description,source_url,source_platform,posted_at,scraped_at,category,category_score,city,province,postal_code,contact_method,status,claimed_by,raw,source_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).bind(lead.id, contentHash, lead.title, lead.description, lead.source_url, lead.source_platform, lead.posted_at, lead.scraped_at, lead.category, lead.category_score, lead.city, lead.province, lead.postal_code, lead.contact_method, lead.status, lead.claimed_by, lead.raw, source.id).run();
    run.added++;
  }
  if (run.errors.length > 20) run.errors = run.errors.slice(0, 20);
  if (run.rejected) run.status = run.added || run.duplicates ? 'completed_with_warnings' : 'failed';
  await writeImportRun(env, run);
  return run;
}

async function runApprovedSources(env, createdBy = 'scheduler') {
  const sources = await env.DB.prepare("SELECT * FROM lead_sources WHERE status = 'active' AND mode IN ('api','rss','owned_feed') AND approval_status = 'approved'").all();
  const results = [];
  for (const source of (sources.results || [])) {
    const readiness = sourceReadiness(source);
    if (!readiness.ready) { results.push({ source_id: source.id, status: 'skipped', reason: readiness.reason }); continue; }
    try {
      const response = await fetch(source.feed_url, { headers: { Accept: 'application/json, application/rss+xml, application/atom+xml, text/xml;q=0.9, text/plain;q=0.5', 'User-Agent': 'LINX-Approved-Source/1.0 (+https://linxservices.ca)' }, redirect: 'error' });
      const size = Number(response.headers.get('content-length') || 0);
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
      if (size > 1000000) throw new Error('Source response exceeds the 1 MB intake limit.');
      const rows = parseApprovedFeed(await response.text(), response.headers.get('content-type') || '');
      const run = await importLeadRows(env, source, rows, null, 'approved_automated', createdBy);
      await env.DB.prepare("UPDATE lead_sources SET last_run_at = datetime('now'), last_status = ?, last_error = '', updated_at = datetime('now') WHERE id = ?").bind(run.status, source.id).run();
      results.push({ source_id: source.id, source: source.name, ...run });
    } catch (error) {
      const message = String(error?.message || 'Approved-source intake failed.').slice(0, 500);
      await env.DB.prepare("UPDATE lead_sources SET last_run_at = datetime('now'), last_status = 'error', last_error = ?, updated_at = datetime('now') WHERE id = ?").bind(message, source.id).run();
      results.push({ source_id: source.id, source: source.name, status: 'error', error: message });
    }
  }
  return results;
}

async function createShortLink(env, input, createdBy) {
  const normalized = normalizeShortLinkInput(input);
  if (normalized.error) throw new Error(normalized.error);
  let slug = normalized.slug;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (!slug) slug = generatedSlug();
    const existing = await env.DB.prepare('SELECT id FROM short_links WHERE slug = ?').bind(slug).first();
    if (!existing) break;
    if (normalized.slug) throw new Error('That custom slug is already in use.');
    slug = '';
  }
  if (!slug) throw new Error('A unique short-link slug could not be generated. Please try again.');
  const id = requestId();
  await env.DB.prepare('INSERT INTO short_links (id, slug, destination_url, created_by) VALUES (?, ?, ?, ?)').bind(id, slug, normalized.destination_url, createdBy || '').run();
  const base = String(env.SHORT_LINK_BASE_URL || 'https://linxservices.ca/r').replace(/\/$/, '');
  return { id, slug, destination_url: normalized.destination_url, short_url: `${base}/${slug}` };
}

async function shortLinkOverview(env) {
  const [summary, links, country] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS total_links, (SELECT COUNT(*) FROM short_link_clicks) AS total_clicks, (SELECT COUNT(*) FROM short_link_clicks WHERE date(clicked_at) = date('now')) AS clicks_today FROM short_links WHERE status = 'active'").first(),
    env.DB.prepare("SELECT l.id, l.slug, l.destination_url, l.created_at, l.last_clicked_at, COUNT(c.id) AS clicks, COALESCE((SELECT country FROM short_link_clicks c2 WHERE c2.short_link_id = l.id AND c2.country != '' GROUP BY country ORDER BY COUNT(*) DESC, MAX(clicked_at) DESC LIMIT 1), '') AS top_country FROM short_links l LEFT JOIN short_link_clicks c ON c.short_link_id = l.id WHERE l.status = 'active' GROUP BY l.id ORDER BY l.created_at DESC LIMIT 100").all(),
    env.DB.prepare("SELECT country FROM short_link_clicks WHERE country != '' GROUP BY country ORDER BY COUNT(*) DESC, MAX(clicked_at) DESC LIMIT 1").first(),
  ]);
  const base = String(env.SHORT_LINK_BASE_URL || 'https://linxservices.ca/r').replace(/\/$/, '');
  return { summary: { total_links: Number(summary?.total_links || 0), total_clicks: Number(summary?.total_clicks || 0), clicks_today: Number(summary?.clicks_today || 0), top_country: country?.country || '—' }, links: (links.results || []).map(link => ({ ...link, clicks: Number(link.clicks || 0), short_url: `${base}/${link.slug}` })) };
}

// ─── Route handler ───────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // Pre-flight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Normalise path: strip trailing slash, treat /_api_foo as /api/foo
    let path = url.pathname.replace(/\/$/, '') || '/';
    // Map /_api_auth_login → /api/auth/login etc.
    path = path.replace(/^\/_api_auth_login$/, '/api/auth/login')
               .replace(/^\/_api_auth_refresh$/, '/api/auth/refresh')
               .replace(/^\/_api_crawler_status$/, '/api/crawler/status')
               .replace(/^\/_api_crawler_start$/, '/api/crawler/start')
               .replace(/^\/_api_crawler_stop$/, '/api/crawler/stop')
               .replace(/^\/_api_leads_stats$/, '/api/leads/stats')
               .replace(/^\/_api_leads_categories$/, '/api/leads/categories')
               .replace(/^\/_api_leads_sources$/, '/api/leads/sources')
               .replace(/^\/_api_leads$/, '/api/leads')
               .replace(/^\/_api_leads\//, '/api/leads/');

    const method = request.method.toUpperCase();

    // ── GET /r/:slug — branded short-link redirect with minimized analytics ──
    const shortLinkMatch = path.match(/^\/r\/([a-z0-9_-]{3,64})$/i);
    if (shortLinkMatch && method === 'GET') {
      if (!env.DB) return new Response('Short links are temporarily unavailable.', { status: 503 });
      const link = await env.DB.prepare("SELECT id, destination_url FROM short_links WHERE slug = ? AND status = 'active'").bind(shortLinkMatch[1].toLowerCase()).first();
      if (!link) return new Response('Short link not found.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=UTF-8' } });
      const country = String(request.cf?.country || '').slice(0, 2);
      const device = deviceCategory(request.headers.get('User-Agent') || '');
      const referer = refererHost(request.headers.get('Referer') || '');
      await Promise.all([
        env.DB.prepare('INSERT INTO short_link_clicks (id, short_link_id, country, device, referer_host) VALUES (?, ?, ?, ?, ?)').bind(requestId(), link.id, country, device, referer).run(),
        env.DB.prepare("UPDATE short_links SET last_clicked_at = datetime('now') WHERE id = ?").bind(link.id).run(),
      ]);
      return Response.redirect(link.destination_url, 302);
    }

    // ── POST /api/osint/passive-scan — bounded public domain observations ───
    if (path === '/api/osint/passive-scan' && method === 'POST') {
      const { target } = await readBody(request);
      try {
        const report = await runPassiveDomainObservation(target);
        return json({ ok: true, report }, 200, origin);
      } catch (error) {
        return json({ ok: false, error: String(error?.message || 'Passive observation could not be completed.').slice(0, 240) }, 400, origin);
      }
    }

    // ── Short-link management — administrator-only ──────────────────────────
    if (path === '/api/admin/short-links' && method === 'GET') {
      const identity = await requireAuth(request, env);
      if (!identity || identity.role !== 'admin') return json({ error: 'Administrator authentication is required.' }, 401, origin);
      if (!env.DB) return json({ error: 'Short-link storage is not configured.' }, 503, origin);
      return json({ ok: true, ...(await shortLinkOverview(env)) }, 200, origin);
    }
    if (path === '/api/admin/short-links' && method === 'POST') {
      const identity = await requireAuth(request, env);
      if (!identity || identity.role !== 'admin') return json({ error: 'Administrator authentication is required.' }, 401, origin);
      if (!env.DB) return json({ error: 'Short-link storage is not configured.' }, 503, origin);
      try { return json({ ok: true, link: await createShortLink(env, await readBody(request), identity.sub || identity.username || 'admin') }, 201, origin); }
      catch (error) { return json({ error: String(error?.message || 'Short link could not be created.').slice(0, 240) }, 400, origin); }
    }

    // ── POST /api/events/pageview — privacy-safe public telemetry ──────────
    if (path === '/api/events/pageview' && method === 'POST') {
      const body = await readBody(request);
      await recordPageView(env, body);
      return json({ ok: true }, 202, origin);
    }

    // ── POST /api/webhooks/twilio/status — signed delivery receipts ─────────
    if (path === '/api/webhooks/twilio/status' && method === 'POST') {
      const rawBody = await request.text();
      const valid = await verifyTwilioStatusCallback(request, rawBody, env.TWILIO_AUTH_TOKEN);
      if (!valid) return json({ error: 'Invalid Twilio signature.' }, 403, origin);
      const form = new URLSearchParams(rawBody);
      const messageSid = form.get('MessageSid') || form.get('SmsSid');
      const messageStatus = (form.get('MessageStatus') || '').toLowerCase();
      if (env.DB && messageSid) {
        const status = ['failed', 'undelivered'].includes(messageStatus) ? 'failed' : ['delivered', 'sent', 'accepted', 'queued'].includes(messageStatus) ? 'sent' : 'pending';
        await env.DB.prepare("UPDATE signup_delivery_events SET status = ?, last_error = ?, updated_at = datetime('now') WHERE external_id = ?")
          .bind(status, status === 'failed' ? (form.get('ErrorCode') || messageStatus || 'Twilio delivery failed') : null, messageSid).run();
      }
      return new Response(null, { status: 204 });
    }

    // ── POST /api/billing/checkout — server-created Stripe subscription flow ─
    if (path === '/api/billing/checkout' && method === 'POST') {
      if (!env.STRIPE_SECRET_KEY) return json({ error: 'Stripe checkout is not configured.' }, 503, origin);
      const { plan } = await readBody(request);
      try {
        const checkout = await createStripeCheckoutSession(env, plan);
        return json({ ok: true, plan: checkout.plan.key, checkout_url: checkout.session.url }, 200, origin);
      } catch (error) {
        return json({ error: error?.message || 'Stripe checkout could not be started.' }, 400, origin);
      }
    }

    // ── POST /api/webhooks/stripe — signed Stripe subscription state sync ───
    if (path === '/api/webhooks/stripe' && method === 'POST') {
      if (!env.DB) return json({ error: 'Subscription storage is not configured.' }, 503, origin);
      if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Stripe webhook verification is not configured.' }, 503, origin);
      const rawBody = await request.text();
      const valid = await verifyStripeWebhookSignature(rawBody, request.headers.get('Stripe-Signature'), env.STRIPE_WEBHOOK_SECRET);
      if (!valid) return json({ error: 'Invalid Stripe signature.' }, 400, origin);
      let event;
      try { event = JSON.parse(rawBody); } catch (_) { return json({ error: 'Invalid Stripe event payload.' }, 400, origin); }
      if (!event?.id || !event?.type) return json({ error: 'Incomplete Stripe event.' }, 400, origin);
      try {
        const result = await processVerifiedStripeEvent(env, event);
        return json({ received: true, ...result }, 200, origin);
      } catch (error) {
        console.error('[Stripe] Event processing failed', error?.message || error);
        return json({ error: 'Stripe event processing failed.' }, 500, origin);
      }
    }

    // ── GET /api/content/home — approved public text overrides ──────────────
    if (path === '/api/content/home' && method === 'GET') {
      if (!env.DB) return json({ content: {} }, 200, origin);
      try {
        const rows = await env.DB.prepare("SELECT content_key, content_value FROM site_content WHERE content_key IN ('hero_headline','hero_subhead')").all();
        return json({ content: Object.fromEntries((rows.results || []).map(row => [row.content_key, row.content_value])) }, 200, origin);
      } catch (error) {
        return json({ content: {} }, 200, origin);
      }
    }

    // ── GET /api/clam-code/health — role-aware UI capability check ─────────
    if (path === '/api/clam-code/health' && method === 'GET') {
      const identity = await requireAuth(request, env);
      const role = identity?.role === 'admin' ? 'admin' : identity?.role === 'subscriber' ? 'subscriber' : 'public';
      return json({
        ok: true,
        interface: 'clam-code',
        role,
        public_model_available: Boolean(env.AI),
        admin_model_available: role === 'admin' && Boolean(env.CLAUDE_API_KEY || env.OPENROUTER_API_KEY),
        admin_capabilities: role === 'admin' ? ['operations', 'analytics', 'report_drafting', 'technical_planning'] : [],
      }, 200, origin);
    }

    // ── POST /api/clam-code/chat — unified public/admin JSON interface ──────
    if (path === '/api/clam-code/chat' && method === 'POST') {
      const identity = await requireAuth(request, env);
      const role = identity?.role === 'admin' ? 'admin' : identity?.role === 'subscriber' ? 'subscriber' : 'public';
      const body = await readBody(request);
      const messages = normalizeMessages(body.messages);
      if (!messages.length || !messages.some(message => message.role === 'user')) {
        return json({ ok: false, error: 'At least one user message is required.' }, 400, origin);
      }

      const id = requestId();
      const startedAt = Date.now();
        const inputCharacters = messages.reduce((total, message) => total + message.content.length, 0);
        try {
          const result = role === 'admin'
          ? await completeAdminChat(env, messages, await getAdminClamContext(env), identity?.sub)
          : await completePublicChat(env, messages);
        const latencyMs = Date.now() - startedAt;
        await recordAiUsage(env, {
          requestId: id,
          role,
          provider: result.provider,
          model: result.model,
          inputMessages: messages.length,
          inputCharacters,
          outputCharacters: result.content.length,
          usage: result.usage,
          status: 'success',
          latencyMs,
        });
        return json(responseEnvelope({ requestId: id, role, ...result }), 200, origin);
      } catch (error) {
        await recordAiUsage(env, {
          requestId: id,
          role,
          provider: role === 'admin' ? 'openai-compatible-claude' : 'cloudflare-workers-ai',
          model: role === 'admin' ? (env.CLAUDE_MODEL || 'anthropic/claude-sonnet-4.6') : (env.PUBLIC_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast'),
          inputMessages: messages.length,
          inputCharacters,
          outputCharacters: 0,
          status: 'error',
          latencyMs: Date.now() - startedAt,
        });
        return json({ ok: false, request_id: id, error: error?.message || 'Clam Code could not complete the request.' }, 502, origin);
      }
    }

    // ── POST /api/linx-amplify/enhance — public text prompt enhancement ─────
    if (path === '/api/linx-amplify/enhance' && method === 'POST') {
      const input = normalizePromptEnhancementInput(await readBody(request));
      if (input.error) return json({ ok: false, error: input.error }, 400, origin);
      const id = requestId();
      const startedAt = Date.now();
      try {
        const result = await enhancePrompt(env, input);
        await recordAiUsage(env, {
          requestId: id,
          role: 'public',
          provider: result.provider,
          model: result.model,
          inputMessages: 1,
          inputCharacters: input.idea.length,
          outputCharacters: result.content.length,
          usage: null,
          status: 'success',
          latencyMs: Date.now() - startedAt,
        });
        return json({ ok: true, request_id: id, prompt_type: input.promptType, enhanced_prompt: result.content, estimated_tokens: result.estimatedTokens }, 200, origin);
      } catch (error) {
        await recordAiUsage(env, {
          requestId: id,
          role: 'public',
          provider: 'cloudflare-workers-ai',
          model: env.PUBLIC_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast',
          inputMessages: 1,
          inputCharacters: input.idea.length,
          outputCharacters: 0,
          usage: null,
          status: 'error',
          latencyMs: Date.now() - startedAt,
        });
        return json({ ok: false, request_id: id, error: error?.message || 'Prompt enhancement could not be completed.' }, 502, origin);
      }
    }

    // ── POST /api/auth/login ───────────────────────────────────────────────
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = await readBody(request);
      if (!username || !password)
        return json({ error: 'username and password are required' }, 400, origin);

      const configuredUsername = String(env.ADMIN_USERNAME || '').trim();
      const configuredPasswordHash = String(env.ADMIN_PASSWORD_HASH || '').trim();
      if (String(username).trim() !== configuredUsername)
        return json({ error: 'Invalid credentials' }, 401, origin);

      const hash = await sha256hex(password);
      if (!configuredPasswordHash || hash !== configuredPasswordHash)
        return json({ error: 'Invalid credentials' }, 401, origin);

      const now   = Math.floor(Date.now() / 1000);
      const token = await jwtSign({ sub: username, role: 'admin', iat: now, exp: now + 1800 }, env.JWT_SECRET);
      return json({ token, expiresIn: 1800 }, 200, origin);
    }

    // ── POST /api/auth/access — approved subscriber access code sign-in ────
    if (path === '/api/auth/access' && method === 'POST') {
      const { email, code } = await readBody(request);
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const normalizedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      if (!normalizedEmail || !normalizedCode) {
        return json({ error: 'email and access code are required' }, 400, origin);
      }
      if (!env.DB) return json({ error: 'Subscriber access storage is not configured.' }, 503, origin);
      const codeHash = await sha256hex(normalizedCode);
      const member = await env.DB.prepare(`
        SELECT u.id, u.email, u.display_name, u.role, u.status, c.id AS code_id
        FROM access_codes c
        JOIN platform_users u ON u.id = c.user_id
        JOIN subscription_entitlements s ON s.user_id = u.id
        WHERE lower(u.email) = ? AND c.code_hash = ? AND c.used_at IS NULL AND c.expires_at > datetime('now')
          AND u.status = 'active' AND s.status IN ('approved','active')
        ORDER BY s.updated_at DESC
        LIMIT 1
      `).bind(normalizedEmail, codeHash).first();
      if (!member) return json({ error: 'Invalid or expired access code.' }, 401, origin);
      await env.DB.prepare("UPDATE access_codes SET used_at = datetime('now') WHERE id = ?").bind(member.code_id).run();
      const now = Math.floor(Date.now() / 1000);
      const token = await jwtSign({ sub: member.id, email: member.email, role: 'subscriber', iat: now, exp: now + 43200 }, env.JWT_SECRET);
      return json({ token, expiresIn: 43200, user: { id: member.id, email: member.email, name: member.display_name, role: 'subscriber' } }, 200, origin);
    }

    // ── POST /api/auth/refresh ─────────────────────────────────────────────
    if (path === '/api/auth/refresh' && method === 'POST') {
      const payload = await requireAuth(request, env);
      if (!payload) return json({ error: 'Unauthorized' }, 401, origin);
      const now   = Math.floor(Date.now() / 1000);
      const token = await jwtSign({ sub: payload.sub, role: payload.role, iat: now, exp: now + 1800 }, env.JWT_SECRET);
      return json({ token, expiresIn: 1800 }, 200, origin);
    }

    // All routes below require auth
    const admin = await requireAuth(request, env);
    if (!admin) return json({ error: 'Unauthorized' }, 401, origin);

    if (path === '/api/admin/analytics' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const summary = await getPlatformSnapshot(env);
      if (!summary.available) return json({ error: summary.reason }, 503, origin);
      const aiUsage = await env.DB.prepare(`
        SELECT substr(created_at, 1, 10) AS day,
          SUM(CASE WHEN role IN ('public','subscriber') THEN 1 ELSE 0 END) AS public_requests,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admin_requests
        FROM ai_usage_events
        WHERE created_at >= datetime('now','-30 day')
        GROUP BY substr(created_at, 1, 10)
        ORDER BY day DESC
      `).all();
      return json({ summary, ai_usage: aiUsage.results || [] }, 200, origin);
    }

    // ── GET /api/admin/users — user and entitlement overview ───────────────
    if (path === '/api/admin/users' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const users = await env.DB.prepare(`
        SELECT u.id, u.email, u.display_name, u.role, u.status, u.created_at,
          (SELECT tier FROM subscription_entitlements s WHERE s.user_id = u.id ORDER BY s.updated_at DESC LIMIT 1) AS tier,
          (SELECT status FROM subscription_entitlements s WHERE s.user_id = u.id ORDER BY s.updated_at DESC LIMIT 1) AS subscription_status
        FROM platform_users u
        ORDER BY u.created_at DESC
        LIMIT 200
      `).all();
      return json({ users: users.results || [] }, 200, origin);
    }

    // ── GET /api/admin/content — current editable public copy ───────────────
    if (path === '/api/admin/content' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const rows = await env.DB.prepare("SELECT content_key, content_value, updated_at FROM site_content WHERE content_key IN ('hero_headline','hero_subhead')").all();
      return json({ content: Object.fromEntries((rows.results || []).map(row => [row.content_key, row.content_value])), updated_at: Object.fromEntries((rows.results || []).map(row => [row.content_key, row.updated_at])) }, 200, origin);
    }

    // ── PUT /api/admin/content — constrained public copy controls ───────────
    if (path === '/api/admin/content' && method === 'PUT') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const { hero_headline, hero_subhead } = await readBody(request);
      const updates = [
        ['hero_headline', hero_headline, 180],
        ['hero_subhead', hero_subhead, 340],
      ].filter(([, value]) => typeof value === 'string');
      if (!updates.length) return json({ error: 'No editable content fields were supplied.' }, 400, origin);
      for (const [key, value, limit] of updates) {
        const text = value.trim().slice(0, limit);
        if (!text) return json({ error: `${key} cannot be empty.` }, 400, origin);
        await env.DB.prepare(`
          INSERT INTO site_content (content_key,content_value,updated_by,updated_at)
          VALUES (?,?,?,datetime('now'))
          ON CONFLICT(content_key) DO UPDATE SET content_value = excluded.content_value, updated_by = excluded.updated_by, updated_at = excluded.updated_at
        `).bind(key, text, admin.sub).run();
      }
      return json({ ok: true }, 200, origin);
    }

    // ── POST /api/admin/users — approved user + one-time access code ───────
    if (path === '/api/admin/users' && method === 'POST') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const { email, display_name = '', tier = 'approved', subscription_status = 'approved', ...signupInput } = await readBody(request);
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return json({ error: 'A valid email is required.' }, 400, origin);
      if (!validSubscriptionStatus(subscription_status)) return json({ error: 'Invalid subscription status.' }, 400, origin);
      let subscriberInput;
      try { subscriberInput = normalizeSubscriberInput(signupInput); }
      catch (error) { return json({ error: error.message }, 400, origin); }
      const exists = await env.DB.prepare("SELECT id FROM platform_users WHERE email = ?").bind(normalizedEmail).first();
      if (exists) return json({ error: 'A platform user with this email already exists.' }, 409, origin);
      const userId = requestId();
      const entitlementId = requestId();
      const accessCode = createAccessCode();
      const accessCodeHash = await sha256hex(accessCode);
      const codeId = requestId();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const displayName = String(display_name).slice(0, 160);
      const approvedAt = new Date().toISOString();
      const automationEnabled = env.AUTOMATION_ENABLED === 'true';
      const userInsert = automationEnabled
        ? env.DB.prepare("INSERT INTO platform_users (id,email,display_name,phone_e164,company,sms_consent,sms_consent_at,sms_consent_source,role,status) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(userId, normalizedEmail, displayName, subscriberInput.phone_e164 || null, subscriberInput.company || null, subscriberInput.sms_consent ? 1 : 0, subscriberInput.sms_consent ? approvedAt : null, subscriberInput.sms_consent_source || null, 'subscriber', 'active')
        : env.DB.prepare("INSERT INTO platform_users (id,email,display_name,role,status) VALUES (?,?,?,?,?)").bind(userId, normalizedEmail, displayName, 'subscriber', 'active');
      await env.DB.batch([
        userInsert,
        env.DB.prepare("INSERT INTO subscription_entitlements (id,user_id,tier,status,source,approved_by,starts_at) VALUES (?,?,?,?,?,?,datetime('now'))").bind(entitlementId, userId, String(tier).slice(0, 80), subscription_status, 'manual_approval', admin.sub),
        env.DB.prepare("INSERT INTO access_codes (id,user_id,code_hash,expires_at) VALUES (?,?,?,?)").bind(codeId, userId, accessCodeHash, expiresAt),
      ]);
      const automation = automationEnabled
        ? await processApprovalAutomation(env, { id: userId, email: normalizedEmail, display_name: displayName, approved_at_utc: approvedAt, phone_e164: subscriberInput.phone_e164, company: subscriberInput.company, tier: String(tier).slice(0, 80), entitlement_status: subscription_status, sms_consent: subscriberInput.sms_consent, sms_consent_at_utc: subscriberInput.sms_consent ? approvedAt : null, sms_consent_source: subscriberInput.sms_consent_source })
        : { enabled: false, sheet_sync: 'disabled', owner_notification: 'disabled', welcome_sms: 'disabled' };
      return json({ ok: true, user: { id: userId, email: normalizedEmail, display_name: displayName, role: 'subscriber' }, access_code: accessCode, access_code_expires_at: expiresAt, automation }, 201, origin);
    }

    // ── Phase 1 Lead Pipeline — administrator-only operational controls ─────
    if (path === '/api/admin/lead-sources' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const rows = await env.DB.prepare('SELECT * FROM lead_sources ORDER BY updated_at DESC LIMIT 100').all();
      return json({ sources: (rows.results || []).map(sourceView) }, 200, origin);
    }

    if (path === '/api/admin/lead-sources' && method === 'POST') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const source = normalizeLeadSourceInput(await readBody(request));
      if (source.error) return json({ error: source.error }, 400, origin);
      const id = requestId();
      const readiness = sourceReadiness(source);
      await env.DB.prepare(`
        INSERT INTO lead_sources (id,name,source_type,vertical,mode,approval_status,has_owner_permission,robots_allows_crawl,feed_url,field_mapping,max_requests_per_minute,max_concurrent,crawl_window,owner_contact,status,last_status,created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(id, source.name, source.sourceType, source.vertical, source.mode, source.approvalStatus, source.hasOwnerPermission ? 1 : 0, source.robotsAllowsCrawl ? 1 : 0, source.feedUrl, JSON.stringify(source.fieldMapping), source.maxRequestsPerMinute, source.maxConcurrent, source.crawlWindow, source.ownerContact, readiness.ready && source.mode !== 'html_crawl' ? 'active' : 'inactive', readiness.ready ? 'ready' : 'not_configured', admin.sub).run();
      const created = await env.DB.prepare('SELECT * FROM lead_sources WHERE id = ?').bind(id).first();
      return json({ ok: true, source: sourceView(created) }, 201, origin);
    }

    const leadSourcePatch = path.match(/^\/api\/admin\/lead-sources\/([^/]+)$/);
    if (leadSourcePatch && method === 'PATCH') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const existing = await env.DB.prepare('SELECT * FROM lead_sources WHERE id = ?').bind(leadSourcePatch[1]).first();
      if (!existing) return json({ error: 'Lead source not found.' }, 404, origin);
      const source = normalizeLeadSourceInput({ ...existing, ...(await readBody(request)) });
      if (source.error) return json({ error: source.error }, 400, origin);
      const readiness = sourceReadiness(source);
      await env.DB.prepare(`
        UPDATE lead_sources SET name=?,source_type=?,vertical=?,mode=?,approval_status=?,has_owner_permission=?,robots_allows_crawl=?,feed_url=?,field_mapping=?,max_requests_per_minute=?,max_concurrent=?,crawl_window=?,owner_contact=?,status=?,last_status=?,updated_at=datetime('now') WHERE id=?
      `).bind(source.name, source.sourceType, source.vertical, source.mode, source.approvalStatus, source.hasOwnerPermission ? 1 : 0, source.robotsAllowsCrawl ? 1 : 0, source.feedUrl, JSON.stringify(source.fieldMapping), source.maxRequestsPerMinute, source.maxConcurrent, source.crawlWindow, source.ownerContact, readiness.ready && source.mode !== 'html_crawl' ? 'active' : 'inactive', readiness.ready ? 'ready' : 'not_configured', existing.id).run();
      const updated = await env.DB.prepare('SELECT * FROM lead_sources WHERE id = ?').bind(existing.id).first();
      return json({ ok: true, source: sourceView(updated) }, 200, origin);
    }

    if (path === '/api/admin/lead-imports' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const imports = await env.DB.prepare('SELECT r.*, s.name AS source_name FROM lead_import_runs r JOIN lead_sources s ON s.id = r.source_id ORDER BY r.created_at DESC LIMIT 30').all();
      return json({ imports: (imports.results || []).map(row => ({ ...row, errors: (() => { try { return JSON.parse(row.errors || '[]'); } catch (_) { return []; } })() })) }, 200, origin);
    }

    if (path === '/api/admin/leads/import' && method === 'POST') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const { source_id, rows, field_mapping } = await readBody(request);
      if (!Array.isArray(rows) || !rows.length) return json({ error: 'Provide at least one lead row to import.' }, 400, origin);
      if (rows.length > 100) return json({ error: 'Imports are limited to 100 rows at a time.' }, 400, origin);
      const source = await env.DB.prepare('SELECT * FROM lead_sources WHERE id = ?').bind(String(source_id || '')).first();
      if (!source) return json({ error: 'Select a configured source before importing.' }, 400, origin);
      if (source.mode !== 'manual') return json({ error: 'Manual and CSV imports require a source configured for manual intake.' }, 400, origin);
      if (field_mapping && (typeof field_mapping !== 'object' || Array.isArray(field_mapping))) return json({ error: 'Field mapping must be an object.' }, 400, origin);
      if (field_mapping) await env.DB.prepare("UPDATE lead_sources SET field_mapping = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(field_mapping), source.id).run();
      const run = await importLeadRows(env, source, rows, field_mapping, 'manual_csv', admin.sub);
      return json({ ok: true, run }, 201, origin);
    }

    if (path === '/api/admin/lead-sources/run' && method === 'POST') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const results = await runApprovedSources(env, admin.sub);
      return json({ ok: true, results, message: results.length ? 'Approved-source intake completed.' : 'No active approved API, RSS, or owned-feed sources are configured yet.' }, 200, origin);
    }

    if (path === '/api/admin/lead-pipeline/status' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const [sources, imports, lastCrawler] = await Promise.all([
        env.DB.prepare('SELECT * FROM lead_sources ORDER BY updated_at DESC LIMIT 100').all(),
        env.DB.prepare('SELECT r.*, s.name AS source_name FROM lead_import_runs r JOIN lead_sources s ON s.id = r.source_id ORDER BY r.created_at DESC LIMIT 10').all(),
        env.DB.prepare('SELECT * FROM crawler_runs ORDER BY id DESC LIMIT 1').first(),
      ]);
      return json({
        phase: 'phase_1_manual_and_approved_sources',
        sources: (sources.results || []).map(sourceView),
        imports: imports.results || [],
        dedicated_crawler: { enabled: false, message: 'Dedicated crawling is not active. HTML crawl sources remain gated on approved status, owner permission, robots authorization, and deployment of the dedicated service.' },
        legacy_crawler: lastCrawler || null,
      }, 200, origin);
    }

    // ── PATCH /api/admin/users/:id — account and entitlement control ────────
    const adminUserPatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (adminUserPatch && method === 'PATCH') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const { status, subscription_status, tier } = await readBody(request);
      if (status !== undefined && !validUserStatus(status)) return json({ error: 'Invalid user status.' }, 400, origin);
      if (subscription_status !== undefined && !validSubscriptionStatus(subscription_status)) return json({ error: 'Invalid subscription status.' }, 400, origin);
      const user = await env.DB.prepare("SELECT id FROM platform_users WHERE id = ?").bind(adminUserPatch[1]).first();
      if (!user) return json({ error: 'Platform user not found.' }, 404, origin);
      if (status !== undefined) await env.DB.prepare("UPDATE platform_users SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, user.id).run();
      if (subscription_status !== undefined || tier !== undefined) {
        const current = await env.DB.prepare("SELECT id, tier, status FROM subscription_entitlements WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1").bind(user.id).first();
        if (current) {
          await env.DB.prepare("UPDATE subscription_entitlements SET tier = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
            .bind(tier !== undefined ? String(tier).slice(0, 80) : current.tier, subscription_status !== undefined ? subscription_status : current.status, current.id).run();
        } else {
          await env.DB.prepare("INSERT INTO subscription_entitlements (id,user_id,tier,status,source,approved_by,starts_at) VALUES (?,?,?,?,?,?,datetime('now'))")
            .bind(requestId(), user.id, String(tier || 'approved').slice(0, 80), subscription_status || 'approved', 'manual_approval', admin.sub).run();
        }
      }
      return json({ ok: true }, 200, origin);
    }

    // ── GET /api/leads/stats ───────────────────────────────────────────────
    if (path === '/api/leads/stats' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const total   = (await DB(env).prepare("SELECT COUNT(*) AS n FROM leads").first()).n;
      const active  = (await DB(env).prepare("SELECT COUNT(*) AS n FROM leads WHERE status='active'").first()).n;
      const expired = (await DB(env).prepare("SELECT COUNT(*) AS n FROM leads WHERE status='expired'").first()).n;
      const cutoff  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const newToday= (await DB(env).prepare("SELECT COUNT(*) AS n FROM leads WHERE scraped_at >= ?").bind(cutoff).first()).n;
      return json({ total, active, expired, new_today: newToday, active_delta: null }, 200, origin);
    }

    // ── GET /api/leads/categories ──────────────────────────────────────────
    if (path === '/api/leads/categories' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const rows = await DB(env).prepare(
        "SELECT category, COUNT(*) AS count FROM leads GROUP BY category ORDER BY count DESC"
      ).all();
      // Fill in any categories with zero leads so charts always show all categories
      const counts = Object.fromEntries((rows.results || []).map(r => [r.category, r.count]));
      const result = getCategories().map(c => ({ category: c, count: counts[c] || 0 }));
      return json(result, 200, origin);
    }

    // ── GET /api/leads/sources ─────────────────────────────────────────────
    if (path === '/api/leads/sources' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const rows = await DB(env).prepare(
        "SELECT source_platform AS source, COUNT(*) AS count FROM leads GROUP BY source_platform ORDER BY count DESC"
      ).all();
      return json(rows.results || [], 200, origin);
    }

    // ── GET /api/crawler/status ────────────────────────────────────────────
    if (path === '/api/crawler/status' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const last = await DB(env).prepare(
        "SELECT * FROM crawler_runs ORDER BY id DESC LIMIT 1"
      ).first();
      return json({
        running   : false,  // The crawler runs on the Express server, not here
        last_run  : last?.ended_at   || null,
        next_run  : null,
        last_stats: last ? { added: last.added, duplicates: last.duplicates, notified: last.notified } : null,
        errors    : last ? JSON.parse(last.errors || '[]') : [],
        interval  : null,
        note      : 'Legacy crawler controls are retired. Use the Lead Pipeline workspace for manual imports and approved sources.',
      }, 200, origin);
    }

    // Crawler start/stop — stub (not operable from here; signal Express server)
    if (path === '/api/crawler/start' && method === 'POST') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      return json({ success: false, message: 'Legacy crawler scheduling is retired. Configure approved sources in the Lead Pipeline workspace.' }, 410, origin);
    }
    if (path === '/api/crawler/stop' && method === 'POST') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      return json({ success: false, message: 'Legacy crawler scheduling is retired. Configure approved sources in the Lead Pipeline workspace.' }, 410, origin);
    }

    // ── GET /api/leads ─────────────────────────────────────────────────────
    if (path === '/api/leads' && method === 'GET') {
      if (admin.role !== 'admin') return json({ error: 'Administrator access is required.' }, 403, origin);
      const params   = url.searchParams;
      const status   = params.get('status')   || 'active';
      const category = params.get('category') || null;
      const city     = params.get('city')     || null;
      const source   = params.get('source')   || null;
      const limit    = Math.min(parseInt(params.get('limit')  || '20',  10), 200);
      const offset   = parseInt(params.get('offset') || '0', 10);
      const freshHrs = parseInt(params.get('freshness_hours') || '72', 10);
      const cutoff   = new Date(Date.now() - freshHrs * 3600000).toISOString();

      let q = "SELECT id,title,description,source_url,source_platform,posted_at,scraped_at,category,category_score,city,province,postal_code,status,claimed_by,source_id FROM leads WHERE status = ? AND posted_at >= ?";
      const binds = [status, cutoff];
      if (category) { q += " AND category = ?"; binds.push(category); }
      if (city)     { q += " AND city LIKE ?";   binds.push(`%${city}%`); }
      if (source)   { q += " AND source_platform = ?"; binds.push(source); }
      q += " ORDER BY posted_at DESC LIMIT ? OFFSET ?";
      binds.push(limit, offset);

      const rows = await DB(env).prepare(q).bind(...binds).all();
      return json(rows.results || [], 200, origin);
    }

    // ── POST /api/leads — organic lead submission ──────────────────────────
    if (path === '/api/leads' && method === 'POST') {
      const body = await readBody(request);
      if (!body.title) return json({ error: 'title is required' }, 400, origin);

      const { category, score } = classifyLead(`${body.title} ${body.description || ''}`);
      const now    = new Date().toISOString();
      const lead   = {
        id              : uuidv4(),
        title           : (body.title || '').slice(0, 300),
        description     : (body.description || '').slice(0, 2000),
        source_url      : body.sourceUrl || '',
        source_platform : 'organic',
        posted_at       : now,
        scraped_at      : now,
        category,
        category_score  : score,
        city            : body.city || '',
        province        : body.province || '',
        postal_code     : body.postalCode || '',
        contact_method  : body.contactMethod || '',
        status          : 'active',
        claimed_by      : null,
        raw             : `${body.title} ${body.description || ''}`.slice(0, 2000),
      };

      const contentHash = await buildHash(lead);
      const dupCheck    = await isDuplicate(env.DB, lead, contentHash);
      if (dupCheck.isDuplicate) return json({ error: 'Duplicate lead', reason: dupCheck.reason }, 409, origin);

      await DB(env).prepare(`
        INSERT INTO leads (id,content_hash,title,description,source_url,source_platform,posted_at,scraped_at,category,category_score,city,province,postal_code,contact_method,status,claimed_by,raw)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(lead.id,contentHash,lead.title,lead.description,lead.source_url,lead.source_platform,lead.posted_at,lead.scraped_at,lead.category,lead.category_score,lead.city,lead.province,lead.postal_code,lead.contact_method,lead.status,lead.claimed_by,lead.raw).run();

      return json({ lead: { ...lead, content_hash: contentHash }, category }, 201, origin);
    }

    // ── POST /api/leads/ingest — bulk ingest from the Express crawler ──────
    if (path === '/api/leads/ingest' && method === 'POST') {
      const { leads: rawLeads } = await readBody(request);
      if (!Array.isArray(rawLeads) || rawLeads.length === 0)
        return json({ error: 'leads array is required' }, 400, origin);

      let added = 0, duplicates = 0;
      const toInsert = [];

      for (const raw of rawLeads.slice(0, 100)) {
        const { category, score } = classifyLead(`${raw.title} ${raw.description || ''}`);
        const now  = new Date().toISOString();
        const lead = {
          id             : uuidv4(),
          title          : (raw.title || '').slice(0, 300),
          description    : (raw.description || '').slice(0, 2000),
          source_url     : raw.sourceUrl || '',
          source_platform: raw.sourcePlatform || 'unknown',
          posted_at      : raw.postedAt || now,
          scraped_at     : now,
          category,
          category_score : score,
          city           : raw.city || '',
          province       : raw.province || '',
          postal_code    : raw.postalCode || '',
          contact_method : raw.contactMethod || '',
          status         : 'active',
          claimed_by     : null,
          raw            : (raw.raw || raw.title || '').slice(0, 2000),
        };
        const contentHash = await buildHash(lead);
        const dup = await isDuplicate(env.DB, lead, contentHash);
        if (dup.isDuplicate) { duplicates++; continue; }
        toInsert.push({ lead, contentHash });
        added++;
      }

      // Batch insert
      for (const { lead, contentHash } of toInsert) {
        await DB(env).prepare(`
          INSERT OR IGNORE INTO leads (id,content_hash,title,description,source_url,source_platform,posted_at,scraped_at,category,category_score,city,province,postal_code,contact_method,status,claimed_by,raw)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).bind(lead.id,contentHash,lead.title,lead.description,lead.source_url,lead.source_platform,lead.posted_at,lead.scraped_at,lead.category,lead.category_score,lead.city,lead.province,lead.postal_code,lead.contact_method,lead.status,lead.claimed_by,lead.raw).run();
      }

      return json({ added, duplicates }, 200, origin);
    }

    // ── POST /api/leads/crawler-run — record a crawler cycle result ────────
    if (path === '/api/leads/crawler-run' && method === 'POST') {
      const { started_at, ended_at, added = 0, duplicates = 0, notified = 0, errors = [] } = await readBody(request);
      await DB(env).prepare(
        "INSERT INTO crawler_runs (started_at,ended_at,added,duplicates,notified,errors) VALUES (?,?,?,?,?,?)"
      ).bind(started_at || new Date().toISOString(), ended_at || new Date().toISOString(), added, duplicates, notified, JSON.stringify(errors)).run();
      return json({ success: true }, 200, origin);
    }

    // ── GET /api/leads/:id ─────────────────────────────────────────────────
    const singleLeadGet = path.match(/^\/api\/leads\/([^/]+)$/);
    if (singleLeadGet && method === 'GET') {
      const lead = await DB(env).prepare("SELECT * FROM leads WHERE id = ?").bind(singleLeadGet[1]).first();
      if (!lead) return json({ error: 'Lead not found' }, 404, origin);
      return json(lead, 200, origin);
    }

    // ── PATCH /api/leads/:id — update status or claimedBy ─────────────────
    const singleLeadPatch = path.match(/^\/api\/leads\/([^/]+)$/);
    if (singleLeadPatch && method === 'PATCH') {
      const { status, claimedBy } = await readBody(request);
      const allowed = ['active', 'archived', 'expired', 'claimed'];
      if (status && !allowed.includes(status))
        return json({ error: `status must be one of: ${allowed.join(', ')}` }, 400, origin);
      const sets = []; const binds = [];
      if (status)    { sets.push('status = ?');     binds.push(status); }
      if (claimedBy) { sets.push('claimed_by = ?'); binds.push(claimedBy); }
      if (!sets.length) return json({ error: 'No updatable fields' }, 400, origin);
      binds.push(singleLeadPatch[1]);
      await DB(env).prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
      const updated = await DB(env).prepare("SELECT * FROM leads WHERE id = ?").bind(singleLeadPatch[1]).first();
      if (!updated) return json({ error: 'Lead not found' }, 404, origin);
      return json(updated, 200, origin);
    }

    // ── DELETE /api/leads/:id ──────────────────────────────────────────────
    const singleLeadDelete = path.match(/^\/api\/leads\/([^/]+)$/);
    if (singleLeadDelete && method === 'DELETE') {
      const info = await DB(env).prepare("DELETE FROM leads WHERE id = ?").bind(singleLeadDelete[1]).run();
      if (!info.meta.changes) return json({ error: 'Lead not found' }, 404, origin);
      return json({ success: true }, 200, origin);
    }

    return json({ error: 'Not found' }, 404, origin);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runApprovedSources(env, 'scheduler'));
  },
};

// Thin wrapper so we get a proper error if DB binding is missing
function DB(env) {
  if (!env.DB) throw new Error('DB binding is not configured. Check wrangler.jsonc.');
  return env.DB;
}
