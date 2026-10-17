/**
 * lead-routing.js — trade-based routing of contact-form leads to contractors.
 * ─────────────────────────────────────────────────────────────────────────────
 * Notify + claim, NOT auto-assign: a matched lead is inserted into
 * `contractor_leads` with status 'new' for each matched contractor. The
 * contractor accepts or declines via the existing contractor-app endpoints.
 * The lead stays in the `leads` table and remains visible to Darren in admin.
 *
 * Matching is by TRADE only (keywords in the lead message vs the
 * contractor's stored trade). Area matching is intentionally NOT attempted:
 * contractor_users has no service-area column and the contact form collects
 * no structured city, so any area match would be a guess. If service areas
 * are recorded later, add them here.
 *
 * Duplicate-safe: the INSERT is guarded by NOT EXISTS on
 * (contractor, homeowner, phone, trade, status='new'), and the caller skips
 * routing entirely for duplicate submissions.
 */

const TRADE_KEYWORD_MAP = {
  electrical: [
    "electrical", "electrician", "electric", "wiring", "panel", "pony panel",
    "outlet", "outlets", "breaker", "breaker box", "light fixture",
    "ev charger", "ceiling fan", "switch", "rewire", "knob and tube",
  ],
  roofing: [
    "roofing", "roof", "shingle", "shingles", "eavestrough", "gutter",
    "gutters", "soffit", "fascia", "metal roof",
  ],
  plumbing: [
    "plumbing", "plumber", "pipe", "pipes", "faucet", "toilet", "drain",
    "water heater", "hot water tank", "sump pump", "sewer", "leak repair",
  ],
  drywall: ["drywall", "mudding", "taping", "plaster", "drywall repair"],
  painting: ["painting", "paint", "painter", "staining", "repaint"],
  flooring: [
    "flooring", "floor", "hardwood", "laminate", "vinyl plank",
    "engineered hardwood", "tile floor",
  ],
  tile: ["tile", "tiling", "backsplash", "grout", "shower tile"],
};

// Free-text trade labels map onto keyword groups (e.g. "Electrician" -> electrical).
const TRADE_ALIASES = {
  electrician: "electrical",
  roofer: "roofing",
  plumber: "plumbing",
  painter: "painting",
  tiler: "tile",
  drywaller: "drywall",
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Trade tokens for one contractor's stored free-text trade label. */
function tradeTokensFor(trade) {
  const words = String(trade || "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const tokens = new Set();
  for (const word of words) {
    tokens.add(TRADE_ALIASES[word] || word);
  }
  return [...tokens];
}

/** Which trade groups the message keywords match. Returns a Set of tokens. */
export function matchTradeTokens(message) {
  const text = String(message || "");
  const matched = new Set();
  for (const [token, keywords] of Object.entries(TRADE_KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text)) {
        matched.add(token);
        break;
      }
    }
  }
  return matched;
}

/**
 * Insert a 'new' contractor_leads row for each active contractor whose
 * trade matches the lead message. Returns { routed_to, matched_trades }.
 * Best-effort: callers must never fail a submission because routing failed.
 */
export async function routeLeadToContractors(env, contact, leadId) {
  if (!env.DB) return { routed_to: [], matched_trades: [], error: "Database binding is not configured." };
  const matched = matchTradeTokens(contact.message || "");
  if (!matched.size) return { routed_to: [], matched_trades: [] };

  const rows = await env.DB.prepare(
    "SELECT id, trade FROM contractor_users WHERE active = 1"
  ).all();

  const routedTo = [];
  const homeownerName = String(contact.name || "").slice(0, 160);
  const phone = String(contact.phone || "").slice(0, 40);
  const description = [
    contact.message,
    contact.email ? `Contact email: ${contact.email}` : "",
    leadId ? `Source lead: ${leadId}` : "",
  ].filter(Boolean).join("\n").slice(0, 2000);

  for (const contractor of rows.results || []) {
    const tokens = tradeTokensFor(contractor.trade);
    if (!tokens.some((token) => matched.has(token))) continue;
    const trade = String(contractor.trade || "").slice(0, 80);
    const result = await env.DB.prepare(`
      INSERT INTO contractor_leads (id, contractor_id, homeowner_name, phone, address, trade, description, status)
      SELECT ?, ?, ?, ?, ?, ?, ?, 'new'
      WHERE NOT EXISTS (
        SELECT 1 FROM contractor_leads
        WHERE contractor_id = ? AND homeowner_name = ? AND phone = ? AND trade = ? AND status = 'new'
      )
    `).bind(
      crypto.randomUUID(), contractor.id, homeownerName, phone, "", trade, description,
      contractor.id, homeownerName, phone, trade,
    ).run();
    if (result.meta && result.meta.changes > 0) routedTo.push(contractor.id);
  }
  return { routed_to: routedTo, matched_trades: [...matched] };
}
