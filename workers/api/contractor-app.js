/**
 * LinX Contractor App — self-contained API module.
 * ─────────────────────────────────────────────────────────────────────────────
 * Contractor sign-in (access-code based), leads, jobs, and earnings.
 * Every authenticated query is scoped WHERE contractor_id = <verified JWT
 * contractor_id>, so a contractor can never see another contractor's data.
 *
 * This module is intentionally self-contained: its own CORS/json helper,
 * its own HMAC-SHA-256 JWT helpers (mirroring index.js), and its own
 * constant-time access-code comparison. Nothing from index.js is imported,
 * so it can be moved or tested in isolation.
 *
 * Sign-in model
 * ─────────────
 * The contractor enters an access code issued by Darren. The worker stores
 * only the SHA-256 hex digest of the code (never the code itself). A stored
 * value of 'PENDING_ISSUE' means no code has been issued yet and is rejected
 * explicitly — it can never authenticate.
 *
 * Rate limiting
 * ─────────────
 * Sign-in attempts are logged in contractor_login_attempts keyed by a
 * salted SHA-256 hash of the client IP (never the raw IP). Max 10 attempts
 * per rolling 15-minute window per IP.
 */

// ─── CORS + json helper (mirrors index.js) ───────────────────────────────────

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

// ─── base64url + HMAC-SHA-256 JWT (mirrors index.js) ──────────────────────────

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

async function jwtSign(payload, secret) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body   = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key    = await crypto.subtle.importKey(
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

// ─── Pure helpers (exported for unit tests) ──────────────────────────────────

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison. Web Crypto's timingSafeEqual is not
 * guaranteed in Workers, so this manual XOR-fold is used for access-code
 * hash comparisons. Returns true only when both strings are identical.
 */
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validate a job progress move. Returns { ok: true } when `step` is either
 * the same step (idempotent) or exactly one step forward; otherwise
 * { ok: false, error }.
 */
function validateJobStepTransition(currentStep, step) {
  if (!Number.isInteger(step) || step < 1 || step > 5) {
    return { ok: false, error: 'Job progress step must be an integer from 1 to 5.' };
  }
  if (step === currentStep) return { ok: true, noop: true };
  if (step === currentStep + 1) return { ok: true, noop: false };
  return { ok: false, error: 'Job progress can only move forward one step at a time.' };
}

// Sentinel for "no access code issued yet". Rejected explicitly at login.
const PENDING_ISSUE = 'PENDING_ISSUE';

const TRADE_LABELS = {
  Electrical: 'Electrical',
  Roofing: 'Roofing',
};

// ─── Lead claim + status flow ────────────────────────────────────────────────
// Statuses a contractor lead can be in. 'accepted' is legacy (rows written by
// the old Accept button); it behaves exactly like 'claimed'. 'new' is the only
// unclaimed state, and no transition ever goes back to 'new'.
//   new → claimed | declined
//   claimed / accepted → contacted | lost
//   contacted → quoted | lost
//   quoted → booked | lost
//   booked / lost / declined are terminal.

const LEAD_STATUSES = Object.freeze(['new', 'claimed', 'contacted', 'quoted', 'booked', 'lost', 'declined', 'accepted']);

const LEAD_TRANSITIONS = Object.freeze({
  new: ['claimed', 'declined'],
  claimed: ['contacted', 'lost'],
  accepted: ['contacted', 'lost'],
  contacted: ['quoted', 'lost'],
  quoted: ['booked', 'lost'],
  booked: [],
  lost: [],
  declined: [],
});

// Safeguard defaults (hours). Darren can change these two numbers:
//   UNCLAIMED_STALE_HOURS — a 'new' lead unclaimed this long triggers one alert.
//   CONTACT_OVERDUE_HOURS — a 'claimed' lead with no Contacted step this long
//   triggers one alert. Each lead alerts once per condition.
const UNCLAIMED_STALE_HOURS = 24;
const CONTACT_OVERDUE_HOURS = 48;

/**
 * Validate a lead status move. Returns { ok: true } or { ok: false, error }.
 * A note is required when a lead is marked Lost.
 */
function validateLeadStatusTransition(fromStatus, toStatus, note) {
  const from = String(fromStatus || '');
  const to = String(toStatus || '');
  if (!LEAD_STATUSES.includes(to)) return { ok: false, error: 'That lead status is not valid.' };
  if (to === 'new') return { ok: false, error: 'A lead can never go back to new once claimed.' };
  const allowed = LEAD_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    return { ok: false, error: `A lead in '${from || 'unknown'}' cannot move to '${to}'.` };
  }
  if (to === 'lost' && !String(note || '').trim()) {
    return { ok: false, error: 'A note is required when a lead is marked Lost.' };
  }
  return { ok: true };
}

/**
 * Staleness for the UI flag: computed from real timestamps, never stored.
 * 'new' + older than UNCLAIMED_STALE_HOURS → unclaimed.
 * 'claimed'/'accepted' + idle longer than CONTACT_OVERDUE_HOURS → contact_overdue.
 * Malformed dates are treated as not stale rather than inventing an age.
 */
function leadStaleness(row, nowMs = Date.now()) {
  const status = String(row?.status || '');
  if (status === 'new') {
    const created = Date.parse(String(row.created_at || ''));
    if (Number.isFinite(created) && nowMs - created >= UNCLAIMED_STALE_HOURS * 3600 * 1000) {
      return { stale: true, stale_reason: 'unclaimed' };
    }
  }
  if (status === 'claimed' || status === 'accepted') {
    const base = Date.parse(String(row.last_activity_at || row.created_at || ''));
    if (Number.isFinite(base) && nowMs - base >= CONTACT_OVERDUE_HOURS * 3600 * 1000) {
      return { stale: true, stale_reason: 'contact_overdue' };
    }
  }
  return { stale: false, stale_reason: null };
}

/** Public contractor view — never includes access_code_hash. */
function contractorPublicView(row) {
  if (!row) return null;
  return {
    id: row.id,
    trade: row.trade,
    trade_label: TRADE_LABELS[row.trade] || String(row.trade || ''),
    display_name: row.display_name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    active: row.active === 1 || row.active === true,
    created_at: row.created_at,
  };
}

function leadView(row) {
  if (!row) return null;
  const staleness = leadStaleness(row);
  return {
    id: row.id,
    homeowner_name: row.homeowner_name,
    phone: row.phone,
    address: row.address,
    trade: row.trade,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    last_activity_at: row.last_activity_at || row.created_at,
    stale: staleness.stale,
    stale_reason: staleness.stale_reason,
  };
}

function jobView(row) {
  if (!row) return null;
  return {
    id: row.id,
    lead_id: row.lead_id,
    title: row.title,
    address: row.address,
    status_step: row.status_step,
    scheduled_date: row.scheduled_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function payoutView(row) {
  if (!row) return null;
  return {
    id: row.id,
    job_id: row.job_id,
    amount_cents: row.amount_cents,
    status: row.status,
    paid_at: row.paid_at,
    created_at: row.created_at,
  };
}

async function readBody(req) {
  try { return await req.json(); } catch { return {}; }
}

function clientIpHashInput(request, env) {
  const ip = String(request.headers.get('CF-Connecting-IP') || 'unknown').trim();
  return `${env.JWT_SECRET}:contractor-login:${ip}`;
}

/**
 * Authenticate the request as a contractor. Returns { contractor } on success
 * or { error: Response } on failure (401/503). The contractor row is re-read
 * from the DB on every call so a deactivated contractor loses access
 * immediately, and the hash is never exposed.
 */
async function contractorAuth(request, env, origin) {
  if (!env.DB) return { error: json({ error: 'Contractor storage is not configured.' }, 503, origin) };
  if (!env.JWT_SECRET) return { error: json({ error: 'Sign-in is not configured.' }, 503, origin) };
  const auth  = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return { error: json({ error: 'Sign-in is required.' }, 401, origin) };
  const payload = await jwtVerify(token, env.JWT_SECRET);
  if (!payload || !payload.contractor_id) {
    return { error: json({ error: 'Sign-in is invalid or has expired.' }, 401, origin) };
  }
  const contractor = await env.DB.prepare(
    'SELECT id, trade, display_name, company, email, phone, active, created_at FROM contractor_users WHERE id = ? AND active = 1'
  ).bind(String(payload.contractor_id)).first();
  if (!contractor) {
    return { error: json({ error: 'Sign-in is invalid or has expired.' }, 401, origin) };
  }
  return { contractor };
}

// ─── POST /api/contractor/login ──────────────────────────────────────────────
// Body: { code }. Returns { ok, token } on success. JWT expires after 12h.

const LOGIN_ATTEMPT_LIMIT = 10;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;

export async function contractorLogin(request, env, origin = '') {
  if (!env.DB) return json({ error: 'Contractor storage is not configured.' }, 503, origin);
  if (!env.JWT_SECRET) return json({ error: 'Sign-in is not configured.' }, 503, origin);

  // Rate limit by salted IP hash: 10 attempts per rolling 15 minutes.
  const ipHash = await sha256hex(clientIpHashInput(request, env));
  try {
    await env.DB.prepare(
      "DELETE FROM contractor_login_attempts WHERE attempted_at < datetime('now', ?)"
    ).bind(`-${LOGIN_ATTEMPT_WINDOW_MINUTES} minutes`).run();
    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM contractor_login_attempts WHERE ip_hash = ?'
    ).bind(ipHash).first();
    if ((recent?.n || 0) >= LOGIN_ATTEMPT_LIMIT) {
      return json({ error: 'Too many sign-in attempts. Please try again later.' }, 429, origin);
    }
    await env.DB.prepare('INSERT INTO contractor_login_attempts (ip_hash) VALUES (?)').bind(ipHash).run();
  } catch (error) {
    console.warn('[Contractor login] Rate-limit check failed', error?.message || error);
  }

  const { code } = await readBody(request);
  const normalized = String(code || '').trim();
  if (!normalized) return json({ error: 'An access code is required.' }, 400, origin);

  const codeHash = await sha256hex(normalized);

  // Compare against every active contractor's stored hash with a constant-time
  // comparison. PENDING_ISSUE rows are rejected explicitly — they can never
  // authenticate, regardless of the code entered.
  let matched = null;
  try {
    const rows = await env.DB.prepare(
      'SELECT id, access_code_hash FROM contractor_users WHERE active = 1'
    ).all();
    for (const row of rows.results || []) {
      const stored = String(row.access_code_hash || '');
      if (stored === PENDING_ISSUE) continue; // no code issued yet
      if (constantTimeEqual(codeHash, stored)) { matched = row; break; }
    }
  } catch (error) {
    console.warn('[Contractor login] Lookup failed', error?.message || error);
    return json({ error: 'Sign-in is temporarily unavailable.' }, 503, origin);
  }

  if (!matched) {
    return json({ error: 'That access code is not valid.' }, 401, origin);
  }

  const token = await jwtSign(
    { contractor_id: matched.id, exp: Math.floor(Date.now() / 1000) + 12 * 3600 },
    env.JWT_SECRET
  );
  return json({ ok: true, token }, 200, origin);
}

// ─── GET /api/contractor/me ──────────────────────────────────────────────────

export async function contractorMe(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  return json({ ok: true, contractor: contractorPublicView(auth.contractor) }, 200, origin);
}

// ─── GET /api/contractor/leads ───────────────────────────────────────────────
// Active leads for this contractor: new + in-progress (claimed, contacted,
// quoted, legacy accepted). Terminal leads (booked / lost / declined) are not
// listed — they are done. Empty list when none — never invented.

export async function contractorLeads(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const rows = await env.DB.prepare(
    "SELECT id, homeowner_name, phone, address, trade, description, status, created_at, last_activity_at FROM contractor_leads WHERE contractor_id = ? AND status IN ('new', 'claimed', 'contacted', 'quoted', 'accepted') ORDER BY created_at DESC, rowid DESC"
  ).bind(auth.contractor.id).all();
  return json({ ok: true, leads: (rows.results || []).map(leadView) }, 200, origin);
}

// ─── Owner email: lead status changes + stale alerts ─────────────────────────
// Same Resend pattern as the contact-form owner email. Best-effort: failures
// are logged to application_delivery_events and never fail the request.

function leadOwnerEmailPayload(env, { subject, details }) {
  if (env.APPLICATION_NOTIFICATION_ENABLED !== 'true') return null;
  const apiKey = String(env.RESEND_API_KEY || '').trim().slice(0, 512);
  const from = String(env.RESEND_FROM_EMAIL || '').trim().slice(0, 320);
  const to = String(env.OWNER_NOTIFICATION_EMAIL || '').trim().slice(0, 320);
  if (!apiKey || !from || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return null;
  const rows = details.filter(([, value]) => String(value || '').trim());
  const text = [subject, '', ...rows.map(([label, value]) => `${label}: ${String(value).slice(0, 2000)}`)].join('\n');
  const html = `<p>${escapeHtml(subject)}</p><table>${rows
    .map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`).join('')}</table>`;
  return { apiKey, email: { from, to: [to], subject, text, html } };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[c]));
}

async function sendLeadOwnerEmail(env, lead, eventKey, eventType, payload) {
  const result = { status: 'disabled' };
  try {
    if (!payload) {
      await env.DB.prepare(
        "INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, last_error) VALUES (?,?,?,?,?,'Owner email delivery is not configured.')"
      ).bind(crypto.randomUUID(), lead.id, eventKey, eventType, 'disabled').run().catch(() => {});
      return result;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${payload.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': eventKey,
      },
      body: JSON.stringify(payload.email),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) throw new Error(String(data?.message || 'Resend could not queue the owner email.').slice(0, 500));
    await env.DB.prepare(
      'INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, external_id) VALUES (?,?,?,?,?,?)'
    ).bind(crypto.randomUUID(), lead.id, eventKey, eventType, 'sent', data.id).run().catch(() => {});
    return { status: 'sent' };
  } catch (error) {
    const message = String(error?.message || 'Owner email delivery failed.').slice(0, 500);
    await env.DB.prepare(
      'INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, last_error) VALUES (?,?,?,?,?,?)'
    ).bind(crypto.randomUUID(), lead.id, eventKey, eventType, 'failed', message).run().catch(() => {});
    return { status: 'failed', error: message };
  }
}

/**
 * Notify Darren the moment a contractor claims, contacts, or changes the
 * status of a lead. Includes lead name, trade, contractor, new status, and
 * timestamp — plus the previous status and the contractor's note, if any.
 */
async function notifyOwnerOfLeadStatusChange(env, lead, contractor, fromStatus, toStatus, note) {
  const subject = `LINX: Lead ${toStatus} — ${lead.homeowner_name || 'Homeowner'} (${lead.trade || 'trade'})`;
  const payload = leadOwnerEmailPayload(env, {
    subject,
    details: [
      ['Lead', lead.homeowner_name || '(no name)'],
      ['Trade', lead.trade || ''],
      ['Contractor', `${contractor.display_name || contractor.id}${contractor.company ? ` — ${contractor.company}` : ''}`],
      ['Previous status', fromStatus || ''],
      ['New status', toStatus],
      ['Time', new Date().toISOString()],
      ['Note', note || ''],
    ],
  });
  return sendLeadOwnerEmail(env, lead, `lead-status:${lead.id}:${crypto.randomUUID()}`, 'lead_status_change', payload);
}

/** Notify Darren about a stale lead (unclaimed 24h+ / claimed-not-contacted 48h+). */
async function notifyOwnerOfStaleLead(env, lead, contractor, reason) {
  const reasonLabel = reason === 'unclaimed'
    ? `unclaimed for ${UNCLAIMED_STALE_HOURS}+ hours`
    : `claimed but not marked Contacted within ${CONTACT_OVERDUE_HOURS} hours`;
  const subject = `LINX: STALE LEAD — ${lead.homeowner_name || 'Homeowner'} (${lead.trade || 'trade'}) ${reasonLabel}`;
  const payload = leadOwnerEmailPayload(env, {
    subject,
    details: [
      ['Lead', lead.homeowner_name || '(no name)'],
      ['Trade', lead.trade || ''],
      ['Contractor', contractor
        ? `${contractor.display_name || contractor.id}${contractor.company ? ` — ${contractor.company}` : ''}`
        : lead.contractor_id],
      ['Status', lead.status || ''],
      ['Problem', reasonLabel],
      ['Lead received', lead.created_at || ''],
      ['Last activity', lead.last_activity_at || lead.created_at || ''],
      ['Time', new Date().toISOString()],
    ],
  });
  return sendLeadOwnerEmail(env, lead, `lead-stale:${lead.id}:${reason}:${crypto.randomUUID()}`, 'lead_stale_alert', payload);
}

// ─── Shared status-change writer ─────────────────────────────────────────────
// Validates the transition, applies it with a compare-and-swap on the current
// status (so two simultaneous taps can't both win), writes the audit event,
// bumps last_activity_at, and notifies the owner. Returns { lead } or
// { error, status }.

async function applyLeadStatusChange(env, lead, contractor, toStatus, note, actor = 'contractor') {
  const check = validateLeadStatusTransition(lead.status, toStatus, note);
  if (!check.ok) return { error: check.error, status: 400 };
  const cleanNote = String(note || '').trim().slice(0, 500);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    "UPDATE contractor_leads SET status = ?, last_activity_at = ? WHERE id = ? AND contractor_id = ? AND status = ?"
  ).bind(toStatus, now, lead.id, contractor.id, lead.status).run();
  if (!result.meta || result.meta.changes === 0) {
    return { error: 'Lead not found, already handled, or changed by someone else. Please refresh.', status: 409 };
  }
  await env.DB.prepare(
    'INSERT INTO contractor_lead_events (id, lead_id, contractor_id, actor, from_status, to_status, note) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), lead.id, contractor.id, actor, lead.status, toStatus, cleanNote).run();
  const updated = { ...lead, status: toStatus, last_activity_at: now };
  try {
    await notifyOwnerOfLeadStatusChange(env, updated, contractor, lead.status, toStatus, cleanNote);
  } catch (error) {
    console.warn('[Lead status] Owner notification failed', error?.message || error);
  }
  return { lead: updated };
}

// ─── POST /api/contractor/leads/:id/status ───────────────────────────────────
// Body: { status, note? }. The claim flow: claimed → contacted → quoted →
// booked | lost (note required for lost). Never back to 'new'.

export async function contractorLeadStatus(request, env, origin = '', leadId = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  if (!leadId) return json({ error: 'A lead id is required.' }, 400, origin);
  const { status, note } = await readBody(request);
  const lead = await env.DB.prepare(
    'SELECT id, contractor_id, homeowner_name, phone, address, trade, description, status, created_at, last_activity_at FROM contractor_leads WHERE id = ? AND contractor_id = ?'
  ).bind(leadId, auth.contractor.id).first();
  if (!lead) return json({ error: 'Lead not found.' }, 404, origin);
  const result = await applyLeadStatusChange(env, lead, auth.contractor, status, note, 'contractor');
  if (result.error) return json({ error: result.error }, result.status || 400, origin);
  return json({ ok: true, lead: leadView(result.lead) }, 200, origin);
}

// ─── POST /api/contractor/leads/:id/accept | /decline ────────────────────────
// Legacy buttons, kept working: Accept now means Claim, Decline is unchanged.
// Both go through the same writer, so they get the audit event + owner email.

export async function contractorLeadAction(request, env, origin = '', leadId = '', action = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const nextStatus = action === 'accept' ? 'claimed' : action === 'decline' ? 'declined' : null;
  if (!nextStatus) return json({ error: 'Not found.' }, 404, origin);
  if (!leadId) return json({ error: 'A lead id is required.' }, 400, origin);
  const lead = await env.DB.prepare(
    'SELECT id, contractor_id, homeowner_name, phone, address, trade, description, status, created_at, last_activity_at FROM contractor_leads WHERE id = ? AND contractor_id = ?'
  ).bind(leadId, auth.contractor.id).first();
  if (!lead) return json({ error: 'Lead not found.' }, 404, origin);
  const result = await applyLeadStatusChange(env, lead, auth.contractor, nextStatus, '', 'contractor');
  if (result.error) return json({ error: result.error }, result.status || 400, origin);
  return json({ ok: true, lead: leadView(result.lead) }, 200, origin);
}

// ─── Stale-lead safeguard ─────────────────────────────────────────────────────
// Scans contractor_leads for the two silent-failure cases and emails Darren
// once per lead per condition:
//   1. status 'new' and created > UNCLAIMED_STALE_HOURS ago, alert not yet sent.
//   2. status 'claimed'/'accepted' and idle > CONTACT_OVERDUE_HOURS, alert not
//      yet sent (idle measured from last_activity_at).
// Each alert also writes a 'system' audit event. The alert flag is set after
// the attempt (sent, failed, or email disabled) so a broken email config
// cannot re-alert every hour — the lead stays visible as stale in the UI
// (computed stale flag) until it is worked. Called from the hourly cron and
// from POST /api/admin/lead-stale-check.

export async function checkStaleContractorLeads(env) {
  const out = { unclaimed_alerted: 0, contact_overdue_alerted: 0, errors: [] };
  if (!env.DB) return { ...out, errors: ['Contractor storage is not configured.'] };

  const contractorById = async (contractorId) => {
    try {
      return await env.DB.prepare(
        'SELECT id, trade, display_name, company, email, phone, active, created_at FROM contractor_users WHERE id = ?'
      ).bind(String(contractorId)).first();
    } catch { return null; }
  };

  let unclaimed = [];
  try {
    const rows = await env.DB.prepare(
      "SELECT id, contractor_id, homeowner_name, phone, address, trade, description, status, created_at, last_activity_at FROM contractor_leads WHERE status = 'new' AND created_at < datetime('now', ?) AND unclaimed_alert_sent_at IS NULL ORDER BY created_at ASC"
    ).bind(`-${UNCLAIMED_STALE_HOURS} hours`).all();
    unclaimed = rows.results || [];
  } catch (error) {
    out.errors.push(`Unclaimed scan failed: ${error?.message || error}`);
  }
  for (const lead of unclaimed) {
    try {
      const contractor = await contractorById(lead.contractor_id);
      const sent = await notifyOwnerOfStaleLead(env, lead, contractor, 'unclaimed');
      await env.DB.prepare(
        "UPDATE contractor_leads SET unclaimed_alert_sent_at = datetime('now') WHERE id = ?"
      ).bind(lead.id).run();
      await env.DB.prepare(
        "INSERT INTO contractor_lead_events (id, lead_id, contractor_id, actor, from_status, to_status, note) VALUES (?, ?, ?, 'system', 'new', 'new', ?)"
      ).bind(crypto.randomUUID(), lead.id, lead.contractor_id, `Stale alert: unclaimed for ${UNCLAIMED_STALE_HOURS}+ hours (owner email: ${sent.status})`).run();
      out.unclaimed_alerted += 1;
    } catch (error) {
      out.errors.push(`Unclaimed alert for lead ${lead.id} failed: ${error?.message || error}`);
    }
  }

  let overdue = [];
  try {
    const rows = await env.DB.prepare(
      "SELECT id, contractor_id, homeowner_name, phone, address, trade, description, status, created_at, last_activity_at FROM contractor_leads WHERE status IN ('claimed', 'accepted') AND last_activity_at < datetime('now', ?) AND contact_overdue_alert_sent_at IS NULL ORDER BY last_activity_at ASC"
    ).bind(`-${CONTACT_OVERDUE_HOURS} hours`).all();
    overdue = rows.results || [];
  } catch (error) {
    out.errors.push(`Contact-overdue scan failed: ${error?.message || error}`);
  }
  for (const lead of overdue) {
    try {
      const contractor = await contractorById(lead.contractor_id);
      const sent = await notifyOwnerOfStaleLead(env, lead, contractor, 'contact_overdue');
      await env.DB.prepare(
        "UPDATE contractor_leads SET contact_overdue_alert_sent_at = datetime('now') WHERE id = ?"
      ).bind(lead.id).run();
      await env.DB.prepare(
        "INSERT INTO contractor_lead_events (id, lead_id, contractor_id, actor, from_status, to_status, note) VALUES (?, ?, ?, 'system', ?, ?, ?)"
      ).bind(crypto.randomUUID(), lead.id, lead.contractor_id, lead.status, lead.status, `Stale alert: claimed but not marked Contacted within ${CONTACT_OVERDUE_HOURS} hours (owner email: ${sent.status})`).run();
      out.contact_overdue_alerted += 1;
    } catch (error) {
      out.errors.push(`Contact-overdue alert for lead ${lead.id} failed: ${error?.message || error}`);
    }
  }

  return out;
}

// ─── GET /api/contractor/jobs ────────────────────────────────────────────────
// Jobs for this contractor, newest first. Empty list when none.

export async function contractorJobs(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const rows = await env.DB.prepare(
    'SELECT id, lead_id, title, address, status_step, scheduled_date, notes, created_at, updated_at FROM contractor_jobs WHERE contractor_id = ? ORDER BY created_at DESC, rowid DESC'
  ).bind(auth.contractor.id).all();
  return json({ ok: true, jobs: (rows.results || []).map(jobView) }, 200, origin);
}

// ─── POST /api/contractor/jobs/:id/status ────────────────────────────────────
// Body: { step }. Only forward movement by exactly +1, or setting the same
// step idempotently. Contractor-scoped.

export async function contractorJobStatus(request, env, origin = '', jobId = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  if (!jobId) return json({ error: 'A job id is required.' }, 400, origin);
  const { step } = await readBody(request);

  const job = await env.DB.prepare(
    'SELECT id, lead_id, title, address, status_step, scheduled_date, notes, created_at, updated_at FROM contractor_jobs WHERE id = ? AND contractor_id = ?'
  ).bind(jobId, auth.contractor.id).first();
  if (!job) return json({ error: 'Job not found.' }, 404, origin);

  const check = validateJobStepTransition(job.status_step, Number(step));
  if (!check.ok) return json({ error: check.error }, 400, origin);

  if (!check.noop) {
    await env.DB.prepare(
      "UPDATE contractor_jobs SET status_step = ?, updated_at = datetime('now') WHERE id = ? AND contractor_id = ?"
    ).bind(Number(step), jobId, auth.contractor.id).run();
    job.status_step = Number(step);
    job.updated_at = new Date().toISOString();
  }
  return json({ ok: true, job: jobView(job) }, 200, origin);
}

// ─── GET /api/contractor/earnings ────────────────────────────────────────────
// Totals computed live from contractor_payouts — honest zeros when empty.

export async function contractorEarnings(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const totals = await env.DB.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_cents ELSE 0 END), 0) AS pending_total_cents,
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END), 0) AS paid_total_cents
    FROM contractor_payouts
    WHERE contractor_id = ?
  `).bind(auth.contractor.id).first();
  const rows = await env.DB.prepare(
    'SELECT id, job_id, amount_cents, status, paid_at, created_at FROM contractor_payouts WHERE contractor_id = ? ORDER BY created_at DESC, rowid DESC'
  ).bind(auth.contractor.id).all();
  return json({
    ok: true,
    pending_total_cents: totals?.pending_total_cents || 0,
    paid_total_cents: totals?.paid_total_cents || 0,
    payouts: (rows.results || []).map(payoutView),
  }, 200, origin);
}

// ─── GET /api/contractor/profile ─────────────────────────────────────────────
// Same as /me plus trade-specific info.

export async function contractorProfile(request, env, origin = '') {
  const auth = await contractorAuth(request, env, origin);
  if (auth.error) return auth.error;
  const contractor = contractorPublicView(auth.contractor);
  return json({
    ok: true,
    contractor,
    trade_info: { trade: contractor.trade, trade_label: contractor.trade_label },
  }, 200, origin);
}

// Pure helpers exported for unit testing.
export { sha256hex, constantTimeEqual, validateJobStepTransition, contractorPublicView, contractorAuth, leadView, jobView, payoutView, validateLeadStatusTransition, leadStaleness, LEAD_STATUSES, LEAD_TRANSITIONS, UNCLAIMED_STALE_HOURS, CONTACT_OVERDUE_HOURS };
