/**
 * LinX Contractor App — admin management endpoints.
 *
 * Admin-only helpers for the contractor directory. Every function here is
 * called from an admin-authenticated route in index.js; the route layer
 * enforces `admin.role === 'admin'` before any of these run.
 *
 * Access codes are generated server-side and only the SHA-256 hash is stored.
 * The plain code is returned ONCE in the create/reset response so Darren can
 * hand it to the contractor. It is never stored or listed.
 */

async function sha256hex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  let s = '';
  for (let i = 0; i < bytes; i++) s += chars[buf[i] % chars.length];
  return s;
}

/** Code format matches the issued style: PREFIX-XXXX-XXXX (e.g. BILLY-8NX4-2HWH). */
function generateAccessCode(displayName) {
  const prefix = String(displayName || 'LINX').split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'LINX';
  return `${prefix}-${randomToken(4)}-${randomToken(4)}`;
}

function publicContractorView(row) {
  return {
    id: row.id,
    trade: row.trade,
    display_name: row.display_name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    active: row.active === 1,
    created_at: row.created_at,
  };
}

function slugifyId(displayName) {
  const slug = String(displayName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'contractor';
  return `${slug}-${randomToken(6).toLowerCase()}`;
}

/** GET /api/admin/contractors — list all contractors (hashes never leave the DB). */
export async function adminListContractors(env) {
  const rows = await env.DB.prepare(
    `SELECT id, trade, display_name, company, email, phone, active, created_at
     FROM contractor_users ORDER BY created_at ASC LIMIT 200`
  ).all();
  return { contractors: (rows.results || []).map(publicContractorView) };
}

/**
 * POST /api/admin/contractors — create a contractor and issue an access code.
 * Returns the plain code ONCE; only the hash is stored.
 */
export async function adminCreateContractor(env, input = {}) {
  const displayName = String(input.display_name || '').trim().slice(0, 120);
  const email = String(input.email || '').trim().toLowerCase().slice(0, 160);
  if (!displayName) return { error: 'Display name is required.', status: 400 };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'A valid email is required.', status: 400 };

  const existing = await env.DB.prepare('SELECT id FROM contractor_users WHERE email = ?').bind(email).first();
  if (existing) return { error: 'A contractor with that email already exists.', status: 409 };

  const id = slugifyId(displayName);
  const code = generateAccessCode(displayName);
  const hash = await sha256hex(code);
  await env.DB.prepare(
    `INSERT INTO contractor_users (id, trade, display_name, company, email, phone, access_code_hash, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    id,
    String(input.trade || '').trim().slice(0, 80),
    displayName,
    String(input.company || '').trim().slice(0, 160),
    email,
    String(input.phone || '').trim().slice(0, 40),
    hash
  ).run();

  const row = await env.DB.prepare(
    'SELECT id, trade, display_name, company, email, phone, active, created_at FROM contractor_users WHERE id = ?'
  ).bind(id).first();
  return { contractor: publicContractorView(row), access_code: code };
}

/** POST /api/admin/contractors/:id/reset-code — issue a fresh access code. */
export async function adminResetContractorCode(env, id) {
  const row = await env.DB.prepare('SELECT id, display_name FROM contractor_users WHERE id = ?').bind(id).first();
  if (!row) return { error: 'Contractor not found.', status: 404 };
  const code = generateAccessCode(row.display_name);
  const hash = await sha256hex(code);
  await env.DB.prepare("UPDATE contractor_users SET access_code_hash = ? WHERE id = ?").bind(hash, id).run();
  return { contractor_id: id, access_code: code };
}

/** POST /api/admin/contractors/:id/active — activate or deactivate a contractor. */
export async function adminSetContractorActive(env, id, active) {
  const row = await env.DB.prepare('SELECT id FROM contractor_users WHERE id = ?').bind(id).first();
  if (!row) return { error: 'Contractor not found.', status: 404 };
  const value = active ? 1 : 0;
  await env.DB.prepare('UPDATE contractor_users SET active = ? WHERE id = ?').bind(value, id).run();
  return { contractor_id: id, active: value === 1 };
}
