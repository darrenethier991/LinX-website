/**
 * pii-crypto.js — AES-256-GCM field-level encryption for personally
 * identifiable information stored in D1.
 * ─────────────────────────────────────────────────────────────────────────────
 * Homeowner/contractor names, emails, and phone numbers are encrypted with
 * AES-256-GCM (a fresh 96-bit IV per field) BEFORE being written to the
 * database, so a database breach alone never exposes readable PII.
 *
 * Key: 32 bytes as 64 hex chars in the `PII_ENCRYPTION_KEY` secret.
 * Generate with:  openssl rand -hex 32
 * Set with:       wrangler secret put PII_ENCRYPTION_KEY
 *
 * Wire format:  v1.<base64url-iv>.<base64url-ciphertext>
 * Legacy values: anything not starting with "v1." is returned as-is, so
 * rows written before encryption was enabled keep working.
 * Missing key: encrypt() stores plaintext prefixed "plain." and logs a
 * warning (fail-open for the intake funnel, never silently); decrypt()
 * returns a notice string instead of throwing.
 */

const PREFIX = "v1.";
const PLAIN_PREFIX = "plain.";

function b64urlEncode(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importKey(env) {
  const hex = String(env.PII_ENCRYPTION_KEY || "").trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  const raw = new Uint8Array(hex.match(/../g).map((b) => parseInt(b, 16)));
  try {
    return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  } catch {
    return null;
  }
}

/** Encrypt a single PII field. Returns the v1 wire format, or plain.* when no key. */
export async function encryptPII(env, plaintext) {
  const text = typeof plaintext === "string" ? plaintext : "";
  if (!text) return "";
  const key = await importKey(env);
  if (!key) {
    console.warn("[pii-crypto] PII_ENCRYPTION_KEY not configured — storing plaintext. Set the secret to enable AES-256-GCM.");
    return PLAIN_PREFIX + text;
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text));
  return PREFIX + b64urlEncode(iv) + "." + b64urlEncode(ct);
}

/** Decrypt a v1 payload. Legacy/plaintext values pass through untouched. */
export async function decryptPII(env, payload) {
  if (typeof payload !== "string" || !payload) return "";
  if (payload.startsWith(PLAIN_PREFIX)) return payload.slice(PLAIN_PREFIX.length);
  if (!payload.startsWith(PREFIX)) return payload; // legacy plaintext row
  const key = await importKey(env);
  if (!key) return "[encrypted — PII_ENCRYPTION_KEY not configured]";
  try {
    const parts = payload.split(".");
    if (parts.length !== 3) return "[decryption failed: bad format]";
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64urlDecode(parts[1]) },
      key,
      b64urlDecode(parts[2])
    );
    return new TextDecoder().decode(pt);
  } catch {
    return "[decryption failed]";
  }
}

/** Encrypt the PII fields of a contact object. Returns {name,email,phone} encrypted. */
export async function encryptContactPII(env, { name, email, phone }) {
  const [n, e, p] = await Promise.all([
    encryptPII(env, name),
    encryptPII(env, email),
    encryptPII(env, phone),
  ]);
  return { name: n, email: e, phone: p };
}

/** Decrypt a stored v1 contact bundle {name,email,phone}. */
export async function decryptContactPII(env, bundle) {
  if (!bundle || typeof bundle !== "object") return { name: "", email: "", phone: "" };
  const [name, email, phone] = await Promise.all([
    decryptPII(env, bundle.name),
    decryptPII(env, bundle.email),
    decryptPII(env, bundle.phone),
  ]);
  return { name, email, phone };
}
