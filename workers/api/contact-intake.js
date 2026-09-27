/**
 * contact-intake.js — public website contact-form intake.
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/contacts flow:
 *   1. Validate + normalize the submission (never trust the client).
 *   2. Store it as a lead in D1 (`leads`, source_platform='contact_form').
 *   3. Email the owner via Resend (best effort — never fails the request).
 *   4. Append a row to the Google Sheet CRM (best effort — never fails the request).
 *
 * Required env:
 *   env.DB — D1 database (linx-db)
 * Owner email needs: APPLICATION_NOTIFICATION_ENABLED='true', RESEND_API_KEY (secret),
 *   RESEND_FROM_EMAIL, OWNER_NOTIFICATION_EMAIL.
 * Sheets needs: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (secret),
 *   GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SHEETS_CONTACTS_TAB (optional, default "Contact Form").
 */

import { getGoogleAccessToken } from "./signup-automation.js";

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

export async function storeContactLead(env, contact) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const hash = await contentHash(`${contact.email}|${contact.phone}|${contact.message}`.toLowerCase());

  const existing = await env.DB.prepare("SELECT id FROM leads WHERE content_hash = ?").bind(hash).first();
  if (existing) return { id: existing.id, duplicate: true };

  const title = `Contact form — ${contact.name}`.slice(0, 300);
  const description = [
    `Role: ${contact.role}`,
    contact.email ? `Email: ${contact.email}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
    "",
    contact.message,
  ].filter((line) => line !== null).join("\n").slice(0, 2000);

  await env.DB.prepare(`
    INSERT INTO leads (id,content_hash,title,description,source_url,source_platform,posted_at,scraped_at,category,category_score,city,province,postal_code,contact_method,status,claimed_by,raw)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, hash, title, description, "", "contact_form", now, now,
    contact.role === "contractor" ? "contractor_signup" : "homeowner_inquiry", 0,
    "", "", "", [contact.email, contact.phone].filter(Boolean).join(" / "),
    "new", null,
    JSON.stringify({ name: contact.name, email: contact.email, phone: contact.phone, role: contact.role, source: contact.source }).slice(0, 2000),
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

  try {
    const emailResult = await notifyOwnerOfContact(env, stored.id, contact);
    delivery.owner_email = emailResult.status;
    if (emailResult.error) delivery.owner_email_error = emailResult.error;
  } catch (error) {
    delivery.owner_email = "failed";
    delivery.owner_email_error = safeText(error?.message, 300);
  }

  try {
    delivery.sheets = (await appendContactToSheet(env, stored.id, contact)).status;
  } catch (error) {
    delivery.sheets = "failed";
    delivery.sheets_error = safeText(error?.message, 300);
  }

  return { leadId: stored.id, duplicate: stored.duplicate, delivery };
}
