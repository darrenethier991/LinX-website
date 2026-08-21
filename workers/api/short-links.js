const RESERVED_SLUGS = new Set(['api', 'admin', 'about', 'contact', 'pricing', 'services', 'status', 'osint', 'marketplace', 'ecosystem', 'white-label', 'clam-code', 'linx-amplify']);

export function normalizeShortLinkInput(value) {
  const destination = typeof value?.destination_url === 'string' ? value.destination_url.trim().slice(0, 2048) : '';
  const requestedSlug = typeof value?.slug === 'string' ? value.slug.trim().toLowerCase() : '';
  if (!destination) return { error: 'Enter a destination URL.' };
  let parsed;
  try { parsed = new URL(destination); } catch (_) { return { error: 'Enter a valid destination URL.' }; }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return { error: 'Only HTTP and HTTPS destination URLs are allowed.' };
  if (!requestedSlug) return { destination_url: parsed.toString(), slug: '' };
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(requestedSlug)) return { error: 'Custom slugs must use 3–64 lowercase letters, numbers, hyphens, or underscores.' };
  if (RESERVED_SLUGS.has(requestedSlug)) return { error: 'That custom slug is reserved.' };
  return { destination_url: parsed.toString(), slug: requestedSlug };
}

export function generatedSlug(random = Math.random) {
  return random().toString(36).slice(2, 10).replace(/[^a-z0-9]/g, '').padEnd(6, 'x').slice(0, 12);
}

export function deviceCategory(userAgent = '') {
  const ua = String(userAgent).toLowerCase();
  if (/iphone|android.*mobile|windows phone|ipod/.test(ua)) return 'mobile';
  if (/ipad|tablet|android/.test(ua)) return 'tablet';
  if (ua) return 'desktop';
  return 'other';
}

export function refererHost(referer = '') {
  try { return new URL(referer).hostname.toLowerCase().slice(0, 255); } catch (_) { return ''; }
}
