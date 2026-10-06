/**
 * overflow-intake.js — contractor "Forward to LinX" lead intake.
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/overflow flow:
 *   1. Validate the contractor's access code (SHA-256 compare, active only).
 *   2. Validate + normalize the homeowner lead (never trust the client).
 *   3. Store it as a lead in D1 (`leads`, source_platform='contractor_overflow',
 *      attributed to the contractor in `claimed_by` + raw JSON).
 *   4. Email the owner via Resend (best effort — never fails the request).
 *   5. Append a row to the Google Sheet CRM (best effort — never fails the request).
 *
 * No fake scoring, no fabricated stats — the lead is stored exactly as
 * submitted. Anything derived later must come from real data.
 *
 * Required env:
 *   env.DB — D1 database (linx-db)
 * Owner email needs: APPLICATION_NOTIFICATION_ENABLED='true', RESEND_API_KEY (secret),
 *   RESEND_FROM_EMAIL, OWNER_NOTIFICATION_EMAIL.
 * Sheets needs: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (secret),
 *   GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_OVERFLOW_TAB (optional, default "Homeowner Leads").
 */

import { getGoogleAccessToken } from "./signup-automation.js";

const JOB_TYPES = [
  "Electrical", "Roofing", "Plumbing", "HVAC", "Painting",
  "Drywall", "Flooring", "Kitchen/Bath remodel", "Landscaping",
  "Fencing", "Decks", "Concrete/Asphalt", "Appliance install/repair",
  "General handyman", "Other",
];

const URGENCIES = ["routine", "soon", "urgent"];

const FORWARD_REASONS = ["too_far", "too_busy", "wrong_trade", "too_small", "timing", "other"];

function safeText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safePhone(value) {
  const phone = safeText(value, 32).replace(/[^+\d]/g, "");
  return phone.length >= 7 ? phone : "";
}

function safeEmail(value) {
  const email = safeText(value, 320);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

async function sha256hex(str) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function contentHash(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Look up the contractor by access code. Returns the row or null. */
export async function resolveOverflowContractor(env, code) {
  const normalized = safeText(code, 64);
  if (!normalized) return null;
  const codeHash = await sha256hex(normalized);
  const rows = await env.DB.prepare(
    "SELECT id, trade, display_name, company FROM contractor_users WHERE active = 1"
  ).all();
  for (const row of rows.results || []) {
    const stored = String(row.access_code_hash || "");
    if (!stored || stored === "PENDING_ISSUE") continue;
    if (constantTimeEqual(codeHash, stored)) return row;
  }
  return null;
}

export function normalizeOverflowInput(body = {}) {
  const accessCode = safeText(body.access_code || body.code, 64);
  const homeownerName = safeText(body.homeowner_name || body.name, 160);
  const phone = safePhone(body.phone);
  const email = safeEmail(body.email);
  const jobType = JOB_TYPES.includes(body.job_type) ? body.job_type : safeText(body.job_type, 60);
  const location = safeText(body.location || body.city, 120);
  const urgency = URGENCIES.includes(body.urgency) ? body.urgency : "routine";
  const reason = FORWARD_REASONS.includes(body.reason) ? body.reason : "other";
  const notes = safeText(body.notes || body.message, 2000);

  if (!accessCode) throw new Error("Your contractor access code is required.");
  if (!homeownerName) throw new Error("Please include the homeowner's name.");
  if (!phone && !email) throw new Error("Please include a phone number or email so the homeowner can be reached.");
  if (!jobType) throw new Error("Please choose a job type.");

  return { accessCode, homeownerName, phone, email, jobType, location, urgency, reason, notes };
}

export async function storeOverflowLead(env, contractor, lead) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const hash = await contentHash(
    `${contractor.id}|${lead.phone}|${lead.email}|${lead.homeownerName}|${lead.jobType}`.toLowerCase()
  );

  const existing = await env.DB.prepare("SELECT id FROM leads WHERE content_hash = ?").bind(hash).first();
  if (existing) return { id: existing.id, duplicate: true };

  const title = `Overflow — ${lead.jobType} for ${lead.homeownerName}`.slice(0, 300);
  const description = [
    `Forwarded by: ${contractor.display_name}${contractor.company ? ` (${contractor.company})` : ""} — ${contractor.trade}`,
    `Homeowner: ${lead.homeownerName}`,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.location ? `Location: ${lead.location}` : null,
    `Urgency: ${lead.urgency}`,
    `Forward reason: ${lead.reason.replace(/_/g, " ")}`,
    "",
    lead.notes || "(no notes)",
  ].filter((line) => line !== null).join("\n").slice(0, 2000);

  await env.DB.prepare(`
    INSERT INTO leads (id,content_hash,title,description,source_url,source_platform,posted_at,scraped_at,category,category_score,city,province,postal_code,contact_method,status,claimed_by,raw)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, hash, title, description, "", "contractor_overflow", now, now,
    lead.jobType, 0,
    lead.location, "", "",
    [lead.phone, lead.email].filter(Boolean).join(" / "),
    "new", contractor.id,
    JSON.stringify({
      contractor_id: contractor.id,
      contractor_name: contractor.display_name,
      homeowner_name: lead.homeownerName,
      phone: lead.phone, email: lead.email,
      job_type: lead.jobType, location: lead.location,
      urgency: lead.urgency, reason: lead.reason, notes: lead.notes,
    }).slice(0, 2000),
  ).run();

  return { id, duplicate: false };
}

function escapeHtml(value) {
  return safeText(value, 2000).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[c]));
}

export async function notifyOwnerOfOverflow(env, leadId, contractor, lead) {
  const result = { status: "disabled" };
  try {
    if (env.APPLICATION_NOTIFICATION_ENABLED !== "true") return result;
    const apiKey = safeText(env.RESEND_API_KEY, 512);
    const from = safeText(env.RESEND_FROM_EMAIL, 320);
    const to = safeEmail(env.OWNER_NOTIFICATION_EMAIL);
    if (!apiKey || !from || !to) return result;

    const details = [
      ["Contractor", `${contractor.display_name} (${contractor.trade})`],
      ["Homeowner", lead.homeownerName],
      ["Phone", lead.phone],
      ["Email", lead.email],
      ["Job type", lead.jobType],
      ["Location", lead.location],
      ["Urgency", lead.urgency],
      ["Reason forwarded", lead.reason.replace(/_/g, " ")],
      ["Notes", lead.notes],
    ].filter(([, value]) => safeText(value, 2000));

    const text = ["New LINX overflow lead forwarded by a contractor.", "",
      ...details.map(([label, value]) => `${label}: ${safeText(value, 2000)}`)].join("\n");
    const html = `<p>New LINX overflow lead forwarded by a contractor.</p><table>${details
      .map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>`;

    const eventKey = `overflow:${leadId}:owner_email`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": eventKey,
      },
      body: JSON.stringify({
        from, to: [to],
        subject: `LINX: Overflow lead — ${lead.jobType} (${contractor.display_name})`,
        text, html,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) throw new Error(safeText(data?.message || "Resend could not queue the owner email.", 500));
    await env.DB.prepare(
      "INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, external_id) VALUES (?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(), leadId, eventKey, "owner_email", "sent", data.id).run().catch(() => {});
    return { status: "sent" };
  } catch (error) {
    const message = safeText(error?.message || "Owner email delivery failed.", 500);
    await env.DB.prepare(
      "INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, last_error) VALUES (?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(), leadId, `overflow:${leadId}:owner_email`, "owner_email", "failed", message).run().catch(() => {});
    return { status: "failed", error: message };
  }
}

export async function appendOverflowToSheet(env, leadId, contractor, lead) {
  const sheetId = safeText(env.GOOGLE_SHEETS_SPREADSHEET_ID, 200);
  if (!sheetId) return { status: "not_configured" };
  const tab = safeText(env.GOOGLE_SHEETS_OVERFLOW_TAB, 100) || "Homeowner Leads";
  const accessToken = await getGoogleAccessToken(env); // throws when service-account creds are missing
  const range = encodeURIComponent(`${tab}!A1`);
  const values = [[
    new Date().toISOString(), leadId,
    contractor.display_name, contractor.trade,
    lead.homeownerName, lead.phone, lead.email,
    lead.jobType, lead.location, lead.urgency,
    lead.reason.replace(/_/g, " "), lead.notes,
  ]];
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ majorDimension: "ROWS", values }),
    },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(safeText(payload?.error?.message || "Google Sheets append failed.", 500));
  return { status: "appended", range: payload?.updates?.updatedRange || "" };
}

/**
 * Full overflow intake orchestration. Storage is authoritative; email + sheets
 * are best-effort and reported honestly per channel — they never fail the request.
 */
export async function handleOverflowSubmission(env, body) {
  let lead;
  try {
    lead = normalizeOverflowInput(body);
  } catch (error) {
    return { error: error.message, status: 400 };
  }

  let contractor = null;
  try {
    contractor = await resolveOverflowContractor(env, lead.accessCode);
  } catch (error) {
    return { error: "Contractor lookup is temporarily unavailable.", status: 503 };
  }
  if (!contractor) return { error: "That access code was not recognized. Check the code and try again.", status: 401 };

  const stored = await storeOverflowLead(env, contractor, lead);
  const delivery = { stored: stored.duplicate ? "duplicate" : "stored" };

  try {
    const emailResult = await notifyOwnerOfOverflow(env, stored.id, contractor, lead);
    delivery.owner_email = emailResult.status;
    if (emailResult.error) delivery.owner_email_error = emailResult.error;
  } catch (error) {
    delivery.owner_email = "failed";
    delivery.owner_email_error = safeText(error?.message, 300);
  }

  try {
    delivery.sheets = (await appendOverflowToSheet(env, stored.id, contractor, lead)).status;
  } catch (error) {
    delivery.sheets = "failed";
    delivery.sheets_error = safeText(error?.message, 300);
  }

  return { leadId: stored.id, duplicate: stored.duplicate, delivery };
}

export { JOB_TYPES, URGENCIES, FORWARD_REASONS };
