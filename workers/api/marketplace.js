// ─────────────────────────────────────────────────────────────────────────────
// EchoForge marketplace: listings, bids, and Stripe checkout with the 30%
// LinX platform fee.
//
// Fee mechanics:
// - Third-party seller WITH a Stripe Connect account id on the listing:
//   buyer is charged the full price, Stripe splits it automatically —
//   30% application fee to LinX, 70% transferred to the seller.
// - LinX's own listings (or sellers not yet on Connect): LinX collects the
//   full amount; the 30/70 split is recorded on the order for manual payout.
//
// Connect onboarding (seller Express accounts) is a dashboard-side step;
// the code paths below are ready for it.
// ─────────────────────────────────────────────────────────────────────────────

import { stripeRequest } from "./index.js";

const PLATFORM_FEE_BPS = 3000; // 30%

function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `${prefix}_${[...bytes].map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

function listingView(row, stats) {
  return {
    id: row.id,
    seller_name: row.seller_name,
    title: row.title,
    description: row.description,
    price_cents: row.price_cents,
    category: row.category,
    status: row.status,
    created_at: row.created_at,
    bid_count: stats ? Number(stats.bid_count || 0) : 0,
    highest_bid_cents: stats && stats.highest_bid_cents != null ? Number(stats.highest_bid_cents) : null,
  };
}

export async function listListings(env) {
  const rows = await env.DB.prepare(`
    SELECT l.*, 
      (SELECT COUNT(*) FROM marketplace_bids b WHERE b.listing_id = l.id) AS bid_count,
      (SELECT MAX(amount_cents) FROM marketplace_bids b WHERE b.listing_id = l.id) AS highest_bid_cents
    FROM marketplace_listings l
    WHERE l.status = 'active'
    ORDER BY l.created_at DESC
  `).all();
  return (rows.results || []).map(r => listingView(r, r));
}

export async function getListing(env, id) {
  const row = await env.DB.prepare(`SELECT * FROM marketplace_listings WHERE id = ?`).bind(id).first();
  if (!row) return null;
  const bids = await env.DB.prepare(`
    SELECT id, bidder_name, amount_cents, message, status, created_at
    FROM marketplace_bids WHERE listing_id = ? ORDER BY created_at DESC LIMIT 100
  `).bind(id).all();
  const stats = await env.DB.prepare(`
    SELECT COUNT(*) AS bid_count, MAX(amount_cents) AS highest_bid_cents
    FROM marketplace_bids WHERE listing_id = ?
  `).bind(id).first();
  return { ...listingView(row, stats), bids: bids.results || [] };
}

export async function createListing(env, data) {
  const title = String(data.title || '').trim().slice(0, 120);
  if (!title) return { error: 'A listing title is required.', status: 400 };
  const priceCents = data.price_cents == null || data.price_cents === ''
    ? null
    : Math.round(Number(data.price_cents));
  if (priceCents != null && (!Number.isFinite(priceCents) || priceCents < 100)) {
    return { error: 'Fixed price must be at least $1.00, or left empty for bid-only.', status: 400 };
  }
  const id = newId('lst');
  await env.DB.prepare(`
    INSERT INTO marketplace_listings (id, seller_name, seller_email, seller_stripe_account_id, title, description, price_cents, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    String(data.seller_name || 'LinX').slice(0, 120),
    data.seller_email ? String(data.seller_email).slice(0, 160) : null,
    data.seller_stripe_account_id ? String(data.seller_stripe_account_id).slice(0, 60) : null,
    title,
    String(data.description || '').slice(0, 4000),
    priceCents,
    String(data.category || 'automation').slice(0, 40),
  ).run();
  return { ok: true, id };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function placeBid(env, listingId, data) {
  const listing = await env.DB.prepare(`SELECT id, status FROM marketplace_listings WHERE id = ?`).bind(listingId).first();
  if (!listing) return { error: 'Listing not found.', status: 404 };
  if (listing.status !== 'active') return { error: 'This listing is no longer accepting bids.', status: 409 };
  const bidderName = String(data.bidder_name || '').trim().slice(0, 120);
  const bidderEmail = String(data.bidder_email || '').trim().slice(0, 160);
  const amountCents = Math.round(Number(data.amount_cents));
  if (!bidderName) return { error: 'Your name is required.', status: 400 };
  if (!EMAIL_RE.test(bidderEmail)) return { error: 'A valid email is required.', status: 400 };
  if (!Number.isFinite(amountCents) || amountCents < 100) return { error: 'Bid must be at least $1.00.', status: 400 };
  const id = newId('bid');
  await env.DB.prepare(`
    INSERT INTO marketplace_bids (id, listing_id, bidder_name, bidder_email, amount_cents, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, listingId, bidderName, bidderEmail, amountCents, String(data.message || '').slice(0, 1000)).run();
  return { ok: true, id };
}

export async function createCheckout(env, listingId, buyerEmail) {
  const listing = await env.DB.prepare(`SELECT * FROM marketplace_listings WHERE id = ?`).bind(listingId).first();
  if (!listing) return { error: 'Listing not found.', status: 404 };
  if (listing.status !== 'active') return { error: 'This listing is no longer available.', status: 409 };
  if (listing.price_cents == null) return { error: 'This listing is bid-only — place a bid instead.', status: 400 };
  const email = String(buyerEmail || '').trim();
  if (!EMAIL_RE.test(email)) return { error: 'A valid email is required for checkout.', status: 400 };

  const amount = Number(listing.price_cents);
  const platformFee = Math.round(amount * PLATFORM_FEE_BPS / 10000);
  const sellerAmount = amount - platformFee;
  const orderId = newId('ord');
  const connectDestination = listing.seller_stripe_account_id || null;

  await env.DB.prepare(`
    INSERT INTO marketplace_orders (id, listing_id, buyer_email, amount_cents, platform_fee_cents, seller_amount_cents, connect_destination)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(orderId, listingId, email, amount, platformFee, sellerAmount, connectDestination).run();

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.append('payment_method_types[]', 'card');
  form.set('customer_email', email);
  form.set('line_items[0][price_data][currency]', 'cad');
  form.set('line_items[0][price_data][unit_amount]', String(amount));
  form.set('line_items[0][price_data][product_data][name]', `${listing.title} — EchoForge Marketplace`);
  form.set('line_items[0][quantity]', '1');
  form.set('metadata[linx_marketplace_order_id]', orderId);
  form.set('metadata[linx_marketplace_listing_id]', listingId);
  if (connectDestination) {
    // Stripe Connect: 30% application fee to LinX, 70% to the seller.
    form.set('payment_intent_data[application_fee_amount]', String(platformFee));
    form.set('payment_intent_data[transfer_data][destination]', connectDestination);
  }
  form.set('success_url', (env.STRIPE_SUCCESS_URL || 'https://linxservices.ca/checkout-success.html?session_id={CHECKOUT_SESSION_ID}'));
  form.set('cancel_url', (env.STRIPE_CANCEL_URL || 'https://linxservices.ca/checkout-cancel.html'));

  let session;
  try {
    session = await stripeRequest(env, '/v1/checkout/sessions', { method: 'POST', form });
  } catch (err) {
    await env.DB.prepare(`UPDATE marketplace_orders SET status = 'failed' WHERE id = ?`).bind(orderId).run();
    return { error: err.message || 'Checkout could not be created.', status: 502 };
  }
  if (!session?.url || !session?.id) return { error: 'Stripe did not return a checkout URL.', status: 502 };
  await env.DB.prepare(`UPDATE marketplace_orders SET stripe_session_id = ? WHERE id = ?`).bind(session.id, orderId).run();
  return {
    ok: true,
    url: session.url,
    order_id: orderId,
    amount_cents: amount,
    platform_fee_cents: platformFee,
    seller_amount_cents: sellerAmount,
    split: connectDestination ? 'connect' : 'direct',
  };
}

// Public order lookup for the success page (session ids are unguessable).
export async function getOrderBySession(env, sessionId) {
  const order = await env.DB.prepare(`
    SELECT o.id, o.amount_cents, o.platform_fee_cents, o.status, o.paid_at, l.title
    FROM marketplace_orders o JOIN marketplace_listings l ON l.id = o.listing_id
    WHERE o.stripe_session_id = ?
  `).bind(String(sessionId).slice(0, 120)).first();
  if (!order) return null;
  return {
    id: order.id, title: order.title, amount_cents: order.amount_cents,
    platform_fee_cents: order.platform_fee_cents, status: order.status, paid_at: order.paid_at,
  };
}

// Called from the Stripe webhook when checkout.session.completed carries a
// marketplace order id.
export async function markOrderPaid(env, orderId) {
  const order = await env.DB.prepare(`SELECT id, listing_id, status FROM marketplace_orders WHERE id = ?`).bind(orderId).first();
  if (!order || order.status === 'paid') return;
  await env.DB.prepare(`UPDATE marketplace_orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?`).bind(orderId).run();
  await env.DB.prepare(`UPDATE marketplace_listings SET status = 'sold' WHERE id = ?`).bind(order.listing_id).run();
}
