const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function b64url(value) {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

function safeText(value, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isE164(value) {
  return /^\+[1-9]\d{7,14}$/.test(value || "");
}

export function normalizeSubscriberInput(input = {}) {
  const phoneE164 = safeText(input.phone_e164, 20);
  const smsConsent = input.sms_consent === true;
  const consentSource = safeText(input.sms_consent_source, 80);
  if (phoneE164 && !isE164(phoneE164)) throw new Error("Phone number must use E.164 format, for example +14165550123.");
  if (smsConsent && !phoneE164) throw new Error("An SMS-consented subscriber needs an E.164 phone number.");
  if (smsConsent && !consentSource) throw new Error("Record the explicit SMS consent source before sending a welcome message.");
  return {
    phone_e164: phoneE164,
    company: safeText(input.company, 160),
    sms_consent: smsConsent,
    sms_consent_source: consentSource,
  };
}

export function buildWelcomeMessage(displayName = "there") {
  const firstName = safeText(displayName, 80).split(/\s+/)[0] || "there";
  return `LINX Services: Welcome, ${firstName}. Your subscriber access is approved. Sign in at https://linxservices.ca/subscriber-access.html. Reply STOP to unsubscribe.`;
}

export function buildOwnerMessage(subscriber, sheetStatus, welcomeStatus) {
  return `LINX: New approved subscriber — ${subscriber.display_name || "(no name)"} · ${subscriber.email} · ${subscriber.phone_e164 || "no phone"}. Sheet sync: ${sheetStatus}. Welcome SMS: ${welcomeStatus}.`;
}

async function signGoogleJwt(env) {
  const privateKey = (env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !privateKey) throw new Error("Google Sheets credentials are not configured.");
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = b64url(JSON.stringify({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const der = Uint8Array.from(atob(privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, utf8(signingInput)));
  return `${signingInput}.${b64url(signature)}`;
}

async function getGoogleAccessToken(env) {
  const assertion = await signGoogleJwt(env);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "Google access token request failed.");
  return payload.access_token;
}

async function appendSignupToSheet(env, subscriber, state) {
  const accessToken = await getGoogleAccessToken(env);
  const sheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tab = env.GOOGLE_SHEETS_SIGNUPS_TAB || "Subscriber Signups";
  if (!sheetId) throw new Error("Google Sheets spreadsheet ID is not configured.");
  const range = encodeURIComponent(`${tab}!A1`);
  const values = [[
    subscriber.id, subscriber.approved_at_utc, subscriber.display_name, subscriber.email,
    subscriber.phone_e164, subscriber.company, subscriber.tier, subscriber.entitlement_status,
    String(subscriber.sms_consent), subscriber.sms_consent_at_utc || "", subscriber.sms_consent_source || "",
    state.welcome_sms_status, "", state.owner_notification_status, "",
  ]];
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ majorDimension: "ROWS", values }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Google Sheets append failed.");
  return payload?.updates?.updatedRange || "appended";
}

async function sendTwilioSms(env, to, body) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_MESSAGING_SERVICE_SID) {
    throw new Error("Twilio Messaging Service credentials are not configured.");
  }
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, Body: body, MessagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID, ...(env.TWILIO_STATUS_CALLBACK_URL ? { StatusCallback: env.TWILIO_STATUS_CALLBACK_URL } : {}) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || "Twilio could not queue the SMS.");
  return payload.sid || "queued";
}

async function startDelivery(env, userId, eventType) {
  const eventKey = `approval:${userId}:${eventType}`;
  const existing = await env.DB.prepare("SELECT id,status FROM signup_delivery_events WHERE event_key = ?").bind(eventKey).first();
  if (existing?.status === "sent" || existing?.status === "skipped") return { skip: true, id: existing.id, status: existing.status };
  const id = existing?.id || crypto.randomUUID();
  if (!existing) await env.DB.prepare("INSERT INTO signup_delivery_events (id,user_id,event_key,event_type,status) VALUES (?,?,?,?,?)").bind(id, userId, eventKey, eventType, "pending").run();
  return { skip: false, id, status: "pending" };
}

async function completeDelivery(env, delivery, status, externalId = null, error = null) {
  await env.DB.prepare("UPDATE signup_delivery_events SET status = ?, external_id = ?, last_error = ?, attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?")
    .bind(status, externalId, error, delivery.id).run();
}

export async function processApprovalAutomation(env, subscriber) {
  if (env.AUTOMATION_ENABLED !== "true") return { enabled: false, sheet_sync: "disabled", owner_notification: "disabled", welcome_sms: "disabled" };
  if (!env.DB) return { enabled: true, sheet_sync: "failed", owner_notification: "failed", welcome_sms: "failed", error: "Database binding is not configured." };
  const state = { enabled: true, sheet_sync: "pending", owner_notification: "pending", welcome_sms: subscriber.sms_consent && subscriber.phone_e164 ? "pending" : "skipped_no_consent" };

  const owner = await startDelivery(env, subscriber.id, "owner_notification");
  if (owner.skip) state.owner_notification = owner.status;
  else {
    try { await completeDelivery(env, owner, "sent", await sendTwilioSms(env, env.OWNER_NOTIFICATION_PHONE, buildOwnerMessage(subscriber, "pending", state.welcome_sms))); state.owner_notification = "sent"; }
    catch (error) { await completeDelivery(env, owner, "failed", null, error.message); state.owner_notification = "failed"; }
  }

  if (state.welcome_sms !== "skipped_no_consent") {
    const welcome = await startDelivery(env, subscriber.id, "welcome_sms");
    if (welcome.skip) state.welcome_sms = welcome.status;
    else {
      try { await completeDelivery(env, welcome, "sent", await sendTwilioSms(env, subscriber.phone_e164, buildWelcomeMessage(subscriber.display_name))); state.welcome_sms = "sent"; }
      catch (error) { await completeDelivery(env, welcome, "failed", null, error.message); state.welcome_sms = "failed"; }
    }
  }

  const sheet = await startDelivery(env, subscriber.id, "google_sheet_sync");
  if (sheet.skip) state.sheet_sync = sheet.status;
  else {
    try { await completeDelivery(env, sheet, "sent", await appendSignupToSheet(env, subscriber, state)); state.sheet_sync = "sent"; }
    catch (error) { await completeDelivery(env, sheet, "failed", null, error.message); state.sheet_sync = "failed"; }
  }
  return state;
}
