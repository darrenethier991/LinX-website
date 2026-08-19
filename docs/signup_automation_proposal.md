# LINX Services Signup Automation Proposal

## Recommended Flow

The recommended event is **administrator approval of a subscriber**. The existing LINX Services flow already creates an approved subscriber record and one-time access code through the administrator interface; the automation will attach to that event. It will not send an SMS merely because someone submits a public enquiry or begins a form. This distinction avoids treating an enquiry as permission to receive ongoing messages.

Once an administrator approves a subscriber and the record includes a valid E.164 phone number plus explicit SMS consent, the Worker will create the account and entitlement, append a controlled signup row to Google Sheets, send an owner notification, and send one transactional welcome SMS. Each external delivery will be recorded with an idempotency key and status so retries do not create duplicate rows or messages.

| Step | System action | Failure handling |
|---|---|---|
| 1 | Administrator approves a subscriber in LINX Services. | The account and entitlement remain authoritative in D1. |
| 2 | Worker validates the phone number and stored consent. | If missing, the account is created without sending an SMS. |
| 3 | Worker appends the signup record to Google Sheets. | A sync status and error code are stored for review and retry. |
| 4 | Worker sends an owner notification. | An undelivered notification is logged without blocking account access. |
| 5 | Worker sends the consented welcome SMS via a Twilio Messaging Service. | Message SID, status, and any error are stored for review. |

## Integration Approaches

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---|---|
| **Direct Google Sheets API from the LINX Worker — recommended** | The Worker authenticates with a Google service account and appends a row directly. It keeps the workflow in one monitored system and provides the clearest idempotency and failure logging. Google’s append endpoint accepts a spreadsheet ID, A1 range, and row values. [1] | Google Sheets API use is typically quota-based; Twilio usage is billed by Twilio. | Medium: create a service account, enable Sheets API, and share the sheet with the service account. |
| **Google Apps Script webhook** | The Worker sends one HTTPS request to an Apps Script endpoint that writes the row. It is simpler to adjust sheet logic later, but adds a separate endpoint to secure, monitor, and maintain. | Similar Google and Twilio usage costs. | Lower initial setup, but less centralized reliability and security control. |

The recommendation is the **direct Google Sheets API** route, using a service account with access only to the intended spreadsheet. It supports reliable row append behavior and requires a Google authorization scope such as `https://www.googleapis.com/auth/spreadsheets`. [1]

## Cloudflare Configuration

All sensitive values must be stored as **Cloudflare Worker secrets**, never in browser code or the Git repository. Existing Twilio account and token secrets can be reused only after verifying they belong to the Messaging Service selected for LINX Services.

| Variable | Type | Purpose | Required |
|---|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Environment variable | The Google service-account email that has Editor access to the target sheet. | Yes |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Secret | Service-account private key from the Google JSON key file, stored with newline characters preserved. | Yes |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Environment variable | The identifier from the Google Sheet URL. | Yes |
| `GOOGLE_SHEETS_SIGNUPS_TAB` | Environment variable | Sheet tab name, proposed as `Subscriber Signups`. | Yes |
| `TWILIO_ACCOUNT_SID` | Existing secret | Twilio account identifier used for the message API request. | Yes |
| `TWILIO_AUTH_TOKEN` | Existing secret | Twilio API authentication token. | Yes |
| `TWILIO_MESSAGING_SERVICE_SID` | Environment variable | Messaging Service identifier beginning with `MG`; preferred over a hard-coded sender number. Messaging Services manage sender pools, inbound handling, and delivery callbacks. [2] | Yes |
| `OWNER_NOTIFICATION_PHONE` | Secret | Your E.164 mobile number for the internal new-signup notification. | Yes |
| `TWILIO_STATUS_CALLBACK_URL` | Environment variable | Proposed delivery status callback: `https://api.linxservices.ca/api/webhooks/twilio/status`. | Recommended |
| `LINX_SMS_CONSENT_VERSION` | Environment variable | Version label for the consent language shown in the signup or approval flow. | Recommended |

The Google Sheet must be shared with `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and the Google Sheets API must be enabled in the corresponding Google Cloud project. The Worker will use the Sheets `spreadsheets.values.append` endpoint, which appends the new data after the existing table. [1]

## Proposed Google Sheet Mapping

Create a tab called **Subscriber Signups** with the following header row. The implementation will append one row per approved signup and will not place API secrets, access codes, or full prompt/chat content in the sheet.

| Column | Source | Example or format |
|---|---|---|
| `signup_id` | D1 platform user ID | UUID |
| `approved_at_utc` | Approval event timestamp | ISO 8601 UTC |
| `display_name` | Approved subscriber name | `Alex Morgan` |
| `email` | Approved subscriber email | `alex@example.ca` |
| `phone_e164` | Approved phone | `+14165550123` |
| `company` | Optional signup field | `Example Co.` |
| `tier` | Subscription entitlement | `approved` |
| `entitlement_status` | Subscription entitlement status | `active` or `approved` |
| `sms_consent` | Explicit consent flag | `true` or `false` |
| `sms_consent_at_utc` | Consent timestamp | ISO 8601 UTC |
| `sms_consent_source` | Form or approval flow identifier | `subscriber-access-v1` |
| `welcome_sms_status` | Worker message state | `sent`, `skipped_no_consent`, or `failed` |
| `twilio_message_sid` | Twilio response identifier | `SM…` when sent |
| `owner_notification_status` | Internal notification state | `sent` or `failed` |
| `notes` | Optional administrator note | Plain text, restricted length |

## Proposed Welcome SMS

The welcome message is transactional and will only be sent when explicit SMS consent is recorded. Twilio requires prior express consent before messaging and states that the initial message must identify the sender and include an opt-out instruction. [3]

> **LINX Services:** Welcome, {{first_name}}. Your subscriber access is approved. Sign in at https://linxservices.ca/subscriber-access.html. Reply STOP to unsubscribe.

The accompanying consent label should read:

> **I agree to receive account and access updates from LINX Services by SMS at the number provided. Consent is not a condition of purchase. Reply STOP to unsubscribe.**

The owner notification is separate and sent only to `OWNER_NOTIFICATION_PHONE`:

> **LINX:** New approved subscriber — {{display_name}} · {{email}} · {{phone_e164}}. Sheet sync: {{sheet_status}}. Welcome SMS: {{welcome_status}}.

## Approval Needed Before Deployment

Please confirm the following items before implementation begins:

1. Use the **direct Google Sheets API** approach rather than an Apps Script webhook.
2. Trigger the workflow when an administrator approves a subscriber, rather than on an unapproved public enquiry.
3. Approve the proposed Google Sheet columns and both SMS templates, or provide edits.
4. Provide the required Cloudflare secrets and variables through the secure integration settings. Do not send key values in chat.

## References

[1] [Google Sheets API: `spreadsheets.values.append`](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append)

[2] [Twilio Messaging Services documentation](https://www.twilio.com/docs/messaging/services)

[3] [Twilio Messaging Policy](https://www.twilio.com/en-us/legal/messaging-policy)
