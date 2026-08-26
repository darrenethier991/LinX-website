function safeText(value, max = 240) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function safeEmail(value) {
  const email = safeText(value, 320);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function escapeHtml(value) {
  return safeText(value, 500).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

export function ownerApplicationEmailPayload(env, application) {
  if (env.APPLICATION_NOTIFICATION_ENABLED !== 'true') return null;
  const apiKey = safeText(env.RESEND_API_KEY, 512);
  const from = safeText(env.RESEND_FROM_EMAIL, 320);
  const to = safeEmail(env.OWNER_NOTIFICATION_EMAIL);
  if (!apiKey || !from || !to) return null;

  const details = [
    ['Applicant', application.display_name],
    ['Business', application.business_name],
    ['Trade', application.trade],
    ['City', application.city],
    ['Email', application.email],
  ].filter(([, value]) => safeText(value));
  const text = ['A new LINX contractor application is ready for review.', '', ...details.map(([label, value]) => `${label}: ${safeText(value)}`)].join('\n');
  const html = `<p>A new LINX contractor application is ready for review.</p><table>${details.map(([label, value]) => `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join('')}</table>`;
  return {
    apiKey,
    email: {
      from,
      to: [to],
      subject: 'LINX: New contractor application',
      text,
      html,
    },
  };
}

async function createDelivery(env, applicationId) {
  const eventKey = `application:${applicationId}:owner_email`;
  const existing = await env.DB.prepare('SELECT id, status FROM application_delivery_events WHERE event_key = ?').bind(eventKey).first();
  if (existing?.status === 'sent') return { skip: true, id: existing.id, status: 'sent' };
  const id = existing?.id || crypto.randomUUID();
  if (existing) {
    await env.DB.prepare("UPDATE application_delivery_events SET status = 'pending', last_error = NULL, updated_at = datetime('now') WHERE id = ?").bind(id).run();
  } else {
    await env.DB.prepare("INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status) VALUES (?, ?, ?, 'owner_email', 'pending')").bind(id, applicationId, eventKey).run();
  }
  return { skip: false, id, eventKey };
}

async function completeDelivery(env, delivery, status, externalId = null, error = null) {
  await env.DB.prepare("UPDATE application_delivery_events SET status = ?, external_id = ?, last_error = ?, attempts = attempts + 1, updated_at = datetime('now') WHERE id = ?")
    .bind(status, externalId, error, delivery.id).run();
}

async function recordDisabledDelivery(env, applicationId) {
  const eventKey = `application:${applicationId}:owner_email`;
  const existing = await env.DB.prepare('SELECT id, status FROM application_delivery_events WHERE event_key = ?').bind(eventKey).first();
  if (existing?.status === 'sent') return { status: 'sent', alreadyDelivered: true };
  const id = existing?.id || crypto.randomUUID();
  if (existing) {
    await env.DB.prepare("UPDATE application_delivery_events SET status = 'disabled', last_error = 'Owner email delivery is not configured.', updated_at = datetime('now') WHERE id = ?").bind(id).run();
  } else {
    await env.DB.prepare("INSERT INTO application_delivery_events (id, application_id, event_key, event_type, status, last_error) VALUES (?, ?, ?, 'owner_email', 'disabled', 'Owner email delivery is not configured.')").bind(id, applicationId, eventKey).run();
  }
  return { status: 'disabled' };
}

export async function notifyOwnerOfApplication(env, application) {
  if (!env.DB) return { status: 'failed', error: 'Application delivery storage is not configured.' };
  const payload = ownerApplicationEmailPayload(env, application);
  if (!payload) return recordDisabledDelivery(env, application.id);
  const delivery = await createDelivery(env, application.id);
  if (delivery.skip) return { status: delivery.status, alreadyDelivered: true };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${payload.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': delivery.eventKey,
      },
      body: JSON.stringify(payload.email),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.id) throw new Error(safeText(result?.message || 'Resend could not queue the owner email.', 500));
    await completeDelivery(env, delivery, 'sent', result.id);
    return { status: 'sent' };
  } catch (error) {
    const message = safeText(error?.message || 'Owner email delivery failed.', 500);
    await completeDelivery(env, delivery, 'failed', null, message);
    return { status: 'failed', error: message };
  }
}

export async function reconcileOwnerApplicationNotifications(env, limit = 25) {
  if (env.APPLICATION_NOTIFICATION_ENABLED !== 'true') return { status: 'disabled', processed: 0 };
  if (!env.DB) return { status: 'failed', processed: 0, error: 'Application delivery storage is not configured.' };
  const rows = await env.DB.prepare(`
    SELECT application.id, application.email, application.display_name, application.business_name, application.trade, application.city
    FROM launch_early_access_applications AS application
    LEFT JOIN application_delivery_events AS delivery
      ON delivery.event_key = 'application:' || application.id || ':owner_email'
    WHERE application.status = 'applied'
      AND (delivery.id IS NULL OR delivery.status IN ('disabled', 'failed'))
    ORDER BY application.created_at ASC
    LIMIT ?
  `).bind(Math.max(1, Math.min(100, Number(limit) || 25))).all();
  let sent = 0;
  let failed = 0;
  for (const application of rows.results || []) {
    const result = await notifyOwnerOfApplication(env, application);
    if (result.status === 'sent') sent += 1;
    if (result.status === 'failed') failed += 1;
  }
  return { status: failed ? 'partial' : 'ok', processed: (rows.results || []).length, sent, failed };
}
