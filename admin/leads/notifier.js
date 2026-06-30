/**
 * Lead Notifier — Delivery System
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends lead notifications to matched contractors via:
 *   1. Email      (via Nodemailer / SMTP — configure SMTP_* env vars)
 *   2. Webhooks   (JSON POST to WEBHOOK_URLS — can forward to SMS gateways,
 *                  Slack, Zapier, etc.)
 *   3. In-platform (marks the lead in the store; frontend polls GET /api/leads)
 *
 * To add SMS: configure WEBHOOK_URLS to point at a Twilio serverless function
 * or a Zapier/Make webhook that reads the JSON body and fires an SMS.
 */

'use strict';

const nodemailer = require('nodemailer');
const { updateLead } = require('./store');

// ─── Email transport (lazy-initialised) ──────────────────────────────────────

let _transport = null;

function getTransport() {
  if (_transport) return _transport;
  if (!process.env.SMTP_HOST) return null; // email not configured — skip silently

  _transport = nodemailer.createTransport({
    host   : process.env.SMTP_HOST,
    port   : parseInt(process.env.SMTP_PORT || '587', 10),
    secure : process.env.SMTP_SECURE === 'true',
    auth   : {
      user : process.env.SMTP_USER,
      pass : process.env.SMTP_PASS,
    },
  });
  return _transport;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the HTML email body for a lead notification.
 */
function buildEmailHtml(lead, contractor) {
  const title    = lead.title    || 'New Service Request';
  const category = (lead.category || 'general').replace(/_/g, ' ');
  const city     = lead.city     || 'Unknown location';
  const desc     = (lead.description || '').slice(0, 500);
  const source   = lead.sourcePlatform || 'Unknown source';
  const posted   = lead.postedAt ? new Date(lead.postedAt).toLocaleString('en-CA') : '';
  const boardUrl = process.env.LEAD_BOARD_URL || 'https://linxservices.ca/contractor-leads.html';

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2328;">
  <div style="border-top:4px solid #3b82d4;padding-top:16px;margin-bottom:24px;">
    <img src="https://linxservices.ca/logo.png" alt="LinxServices" style="height:40px;" />
  </div>
  <h2 style="color:#3b82d4;margin-top:0;">New Lead: ${title}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;font-weight:bold;width:140px;">Trade Category</td><td style="text-transform:capitalize;">${category}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold;">Location</td><td>${city}${lead.province ? ', ' + lead.province : ''}${lead.postalCode ? ' ' + lead.postalCode : ''}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold;">Source</td><td>${source}</td></tr>
    <tr><td style="padding:6px 0;font-weight:bold;">Posted</td><td>${posted}</td></tr>
    ${lead.contactMethod ? `<tr><td style="padding:6px 0;font-weight:bold;">Contact Method</td><td>${lead.contactMethod}</td></tr>` : ''}
  </table>
  <div style="background:#f7f8fa;border:1px solid #e5e7eb;border-radius:6px;padding:14px;margin:18px 0;font-size:14px;line-height:1.6;">
    <strong>Description:</strong><br />${desc}${lead.description && lead.description.length > 500 ? '…' : ''}
  </div>
  ${lead.sourceUrl ? `<p style="font-size:13px;color:#57606a;">Original post: <a href="${lead.sourceUrl}">${lead.sourceUrl}</a></p>` : ''}
  <a href="${boardUrl}" style="display:inline-block;background:#3b82d4;color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-size:14px;margin-top:8px;">View All Leads</a>
  <p style="font-size:12px;color:#57606a;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px;">
    You are receiving this because your LinxServices.ca trade profile matches this lead.<br />
    To update your notification preferences, log in and visit Settings.
  </p>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a lead notification to a single contractor.
 *
 * @param {object} lead        The lead object from the store
 * @param {object} contractor  Contractor profile
 * @param {string} contractor.email
 * @param {string} contractor.name
 * @param {string} contractor.id
 * @returns {Promise<{ email: boolean, webhook: boolean }>}
 */
async function notifyContractor(lead, contractor) {
  const results = { email: false, webhook: false };

  // ── 1. Email ──────────────────────────────────────────────────────────────
  const transport = getTransport();
  if (transport && contractor.email) {
    try {
      await transport.sendMail({
        from    : process.env.SMTP_FROM || 'leads@linxservices.ca',
        to      : contractor.email,
        subject : `[LinxServices] New ${(lead.category || 'general').replace(/_/g, ' ')} lead — ${lead.city || 'Canada'}`,
        html    : buildEmailHtml(lead, contractor),
      });
      results.email = true;
    } catch (err) {
      console.warn(`[Notifier] Email failed for contractor ${contractor.id}:`, err.message);
    }
  }

  // ── 2. Webhooks (SMS / Slack / Zapier forward) ────────────────────────────
  const webhookUrls = (process.env.WEBHOOK_URLS || '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);

  if (webhookUrls.length > 0) {
    const payload = JSON.stringify({
      event      : 'new_lead',
      contractorId: contractor.id,
      contractorEmail: contractor.email,
      lead: {
        id           : lead.id,
        title        : lead.title,
        category     : lead.category,
        city         : lead.city,
        sourceUrl    : lead.sourceUrl,
        sourcePlatform: lead.sourcePlatform,
        postedAt     : lead.postedAt,
        description  : (lead.description || '').slice(0, 300),
      },
    });

    await Promise.allSettled(
      webhookUrls.map((url) =>
        fetch(url, {
          method  : 'POST',
          headers : { 'Content-Type': 'application/json' },
          body    : payload,
        }).then(() => { results.webhook = true; })
          .catch((err) => console.warn(`[Notifier] Webhook ${url} failed:`, err.message))
      )
    );
  }

  // ── 3. In-platform — record that this contractor has been notified ─────────
  const already = lead.matchedContractors || [];
  if (!already.includes(contractor.id)) {
    updateLead(lead.id, { matchedContractors: [...already, contractor.id] });
  }

  return results;
}

/**
 * Broadcast a new lead to all matching contractors in a list.
 *
 * @param {object}   lead
 * @param {object[]} contractors  Array of contractor profiles
 * @returns {Promise<number>} Number of contractors notified
 */
async function broadcastLead(lead, contractors) {
  let notified = 0;
  for (const contractor of contractors) {
    try {
      await notifyContractor(lead, contractor);
      notified++;
    } catch (err) {
      console.error(`[Notifier] broadcastLead error for ${contractor.id}:`, err.message);
    }
  }
  return notified;
}

module.exports = { notifyContractor, broadcastLead, buildEmailHtml };
