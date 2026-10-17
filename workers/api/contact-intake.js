/**
 * contact-intake.js — public website contact-form intake.
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/contacts flow:
 *   1. Validate + normalize the submission (never trust the client).
 *   2. Store it as a lead in D1 (`leads`, source_platform='contact_form').
 *   3. Email the owner via Resend (best effort — never fails the request).
 *   4. Email the submitter a receipt confirmation via Resend (best effort —
 *      never fails the request). Honest wording only: receipt confirmed,
 *      LinX will match / Darren will follow up. No time guarantees, no
 *      named contractor, no SMS.
 *   5. Append a row to the Google Sheet CRM (best effort — never fails the request).
 *
 * Required env:
 *   env.DB — D1 database (linx-db)
 * Owner email needs: APPLICATION_NOTIFICATION_ENABLED='true', RESEND_API_KEY (secret),
 *   RESEND_FROM_EMAIL, OWNER_NOTIFICATION_EMAIL.
 * Sheets needs: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (secret),
 *   GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_CONTACTS_TAB (optional, default "Contact Form").
 */

import { getGoogleAccessToken } from "./signup-automation.js";
import { encryptContactPII } from "./pii-crypto.js";
import { routeLeadToContractors } from "./lead-routing.js";

function safeText(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeEmail(value) {
  const email = safeText(value, 320);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function safePhone(value) {
  // Accept loose input, keep digits/+ only. E.164 preferred but not required here.
  const phone = safeText(value, 32).replace(/[^+\d]/g, "");
  return phone.length >= 7 ? phone : "";
}

function escapeHtml(value) {
  return safeText(value, 2000).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  }[c]));
}

export function normalizeContactInput(body = {}) {
  const name = safeText(body.name, 160);
  const email = safeEmail(body.email);
  const phone = safePhone(body.phone);
  const role = ["homeowner", "contractor"].includes(body.role) ? body.role : safeText(body.role, 40) || "unknown";
  const message = safeText(body.notes || body.message || body?.meta?.first_message, 2000);

  if (!name) throw new Error("Please include your name.");
  if (!email && !phone) throw new Error("Please include an email address or phone number so we can reach you.");
  if (!message) throw new Error("Please include a short message about your project or trade.");

  return { name, email, phone, role, message, source: safeText(body.source, 40) || "web" };
}

async function contentHash(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Hash-only normalization: what gets STORED is untouched, but the dedup hash
// ignores cosmetic differences between submissions of the same job — e.g.
// "Job post: upgrade electrical..." vs ": upgrade electrical..." (the two
// Geordie Secord submissions of 2026-10-16 hashed differently and created
// two lead rows). Phone is reduced to digits so formatting can't split one
// number into two leads.
function normalizeForHash(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/^\s*job post:\s*/, "")
    .replace(/^[:\-\u2013\u2014\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function storeContactLead(env, contact) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const hashEmail = String(contact.email || "").trim().toLowerCase();
  const hashPhone = String(contact.phone || "").replace(/\D/g, "");
  const hashMessage = normalizeForHash(contact.message);
  const hash = await contentHash(`${hashEmail}|${hashPhone}|${hashMessage}`);

  const existing = await env.DB.prepare("SELECT id FROM leads WHERE content_hash = ?").bind(hash).first();
  if (existing) return { id: existing.id, duplicate: true };

  // PII is AES-256-GCM encrypted before storage. title/description stay
  // PII-free so contractor/public views never leak contact details; the
  // encrypted bundle lives in `raw` and is decrypted only on admin reads.
  const enc = await encryptContactPII(env, contact);

  const title = `Contact form — ${contact.role}`.slice(0, 300);
  const description = [
    `Role: ${contact.role}`,
    "",
    contact.message,
  ].join("\n").slice(0, 2000);

  await env.DB.prepare(`
    INSERT INTO leads (id,content_hash,title,description,source_url,source_platform,posted_at,scraped_at,category,category_score,city,province,postal_code,contact_method,status,claimed_by,raw)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, hash, title, description, "", "contact_form", now, now,
    contact.role === "contractor" ? "contractor_signup" : "homeowner_inquiry", 0,
    "", "", "", "encrypted",
    "new", null,
    JSON.stringify({ v: 1, name: enc.name, email: enc.email, phone: enc.phone, role: contact.role, source: contact.source, message: contact.message }).slice(0, 2000),
  ).run();

  return { id, duplicate: false };
}

function ownerContactEmailPayload(env, contact) {
  if (env.APPLICATION_NOTIFICATION_ENABLED !== "true") return null;
  const apiKey = safeText(env.RESEND_API_KEY, 512);
  const from = safeText(env.RESEND_FROM_EMAIL, 320);
  const to = safeEmail(env.OWNER_NOTIFICATION_EMAIL);
  if (!apiKey || !from || !to) return null;

  const details = [
    ["Name", contact.name],
    ["Role", contact.role],
    ["Email", contact.email],
    ["Phone", contact.phone],
    ["Message", contact.message],
  ].filter(([, value]) => safeText(value, 2000));

  const text = ["New LINX website contact-form submission.", "",
    ...details.map(([label, value]) => `${label}: ${safeText(value, 2000)}`)].join("\n");
  const html = `<p>New LINX website contact-form submission.</p><table>${details
    .map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</table>`;

  return {
    apiKey,
    email: { from, to: [to], subject: "LINX: New website contact form submission", text, html },
  };
}

export async function notifyOwnerOfContact(env, leadId, contact) {
  const result = { status: "disabled" };
  try {
    const payload = ownerContactEmailPayload(env, contact);
    const eventKey = `contact:${leadId}:owner_email`;
    if (!payload) {
      await env.DB.prepare(
        "INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, last_error) VALUES (?,?,?,?,?,'Owner email delivery is not configured.')"
      ).bind(crypto.randomUUID(), leadId, eventKey, "owner_email", "disabled").run().catch(() => {});
      return result;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": eventKey,
      },
      body: JSON.stringify(payload.email),
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
    ).bind(crypto.randomUUID(), leadId, `contact:${leadId}:owner_email`, "owner_email", "failed", message).run().catch(() => {});
    return { status: "failed", error: message };
  }
}

function submitterContactEmailPayload(env, contact) {
  if (env.APPLICATION_NOTIFICATION_ENABLED !== "true") return null;
  const apiKey = safeText(env.RESEND_API_KEY, 512);
  const from = safeText(env.RESEND_FROM_EMAIL, 320);
  const to = safeEmail(contact.email);
  if (!apiKey || !from || !to) return null;

  const isContractor = contact.role === "contractor";
  const text = [
    `Hi ${contact.name || "there"},`,
    "",
    "Thanks for contacting LinX. We have received your request.",
    isContractor
      ? "Thanks for your interest in joining LinX as a contractor. Darren will follow up."
      : "LinX will match your request with a local contractor and Darren will follow up.",
    "",
    `Your message: ${contact.message}`,
    "",
    "Thanks,",
    "LinX Services",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(contact.name || "there")},</p>`,
    "<p>Thanks for contacting LinX. We have received your request.</p>",
    isContractor
      ? "<p>Thanks for your interest in joining LinX as a contractor. Darren will follow up.</p>"
      : "<p>LinX will match your request with a local contractor and Darren will follow up.</p>",
    `<p>Your message: ${escapeHtml(contact.message)}</p>`,
    "<p>Thanks,<br>LinX Services</p>",
  ].join("");

  return {
    apiKey,
    email: { from, to: [to], subject: "Thanks for contacting LinX — we received your request", text, html },
  };
}

export async function notifySubmitterOfContact(env, leadId, contact) {
  const result = { status: "disabled" };
  try {
    const payload = submitterContactEmailPayload(env, contact);
    const eventKey = `contact:${leadId}:submitter_email`;
    if (!payload) {
      await env.DB.prepare(
        "INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, last_error) VALUES (?,?,?,?,?,'Submitter email delivery is not configured.')"
      ).bind(crypto.randomUUID(), leadId, eventKey, "submitter_confirmation", "disabled").run().catch(() => {});
      return result;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": eventKey,
      },
      body: JSON.stringify(payload.email),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.id) throw new Error(safeText(data?.message || "Resend could not queue the submitter email.", 500));
    await env.DB.prepare(
      "INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, external_id) VALUES (?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(), leadId, eventKey, "submitter_confirmation", "sent", data.id).run().catch(() => {});
    return { status: "sent" };
  } catch (error) {
    const message = safeText(error?.message || "Submitter email delivery failed.", 500);
    await env.DB.prepare(
      "INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, last_error) VALUES (?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(), leadId, `contact:${leadId}:submitter_email`, "submitter_confirmation", "failed", message).run().catch(() => {});
    return { status: "failed", error: message };
  }
}

export async function appendContactToSheet(env, leadId, contact) {
  const sheetId = safeText(env.GOOGLE_SHEETS_SPREADSHEET_ID, 200);
  if (!sheetId) return { status: "not_configured" };
  const tab = safeText(env.GOOGLE_SHEETS_CONTACTS_TAB, 100) || "Contact Form";
  const accessToken = await getGoogleAccessToken(env); // throws when service-account creds are missing
  const range = encodeURIComponent(`${tab}!A1`);
  const values = [[
    new Date().toISOString(), leadId, contact.name, contact.email,
    contact.phone, contact.role, contact.message, contact.source,
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
 * Full intake orchestration. Storage is authoritative; email + sheets are
 * best-effort and reported honestly per channel — they never fail the request.
 */
export async function handleContactSubmission(env, body) {
  let contact;
  try {
    contact = normalizeContactInput(body);
  } catch (error) {
    return { error: error.message, status: 400 };
  }

  const stored = await storeContactLead(env, contact);
  const delivery = { stored: stored.duplicate ? "duplicate" : "stored" };

  // Notify + claim routing: matched contractors get a 'new' row in their app.
  // Skipped for duplicates (already routed). Never fails the request.
  if (stored.duplicate) {
    delivery.routing = "skipped_duplicate";
  } else {
    try {
      const routed = await routeLeadToContractors(env, contact, stored.id);
      delivery.routing = routed.routed_to.length ? routed.routed_to : (routed.error ? "failed" : "no_match");
      if (routed.error) delivery.routing_error = routed.error;
    } catch (error) {
      delivery.routing = "failed";
      delivery.routing_error = safeText(error?.message, 300);
    }
  }

  try {
    const emailResult = await notifyOwnerOfContact(env, stored.id, contact);
    delivery.owner_email = emailResult.status;
    if (emailResult.error) delivery.owner_email_error = emailResult.error;
  } catch (error) {
    delivery.owner_email = "failed";
    delivery.owner_email_error = safeText(error?.message, 300);
  }

  // Duplicate submissions (same contact + job already stored) do NOT get a
  // second welcome email — the homeowner already got one for the first
  // submission. Routing already skips duplicates (patch 04); this is the
  // same rule for the homeowner-facing email. Owner notification + Sheets
  // intentionally still run so Darren sees the resubmission.
  if (stored.duplicate) {
    delivery.submitter_email = "skipped_duplicate";
  } else {
    try {
      const submitterResult = await notifySubmitterOfContact(env, stored.id, contact);
      delivery.submitter_email = submitterResult.status;
      if (submitterResult.error) delivery.submitter_email_error = submitterResult.error;
    } catch (error) {
      delivery.submitter_email = "failed";
      delivery.submitter_email_error = safeText(error?.message, 300);
    }
  }

  try {
    delivery.sheets = (await appendContactToSheet(env, stored.id, contact)).status;
  } catch (error) {
    delivery.sheets = "failed";
    delivery.sheets_error = safeText(error?.message, 300);
  }

  return { leadId: stored.id, duplicate: stored.duplicate, delivery };
}
