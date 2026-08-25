const SOURCE_MODES = Object.freeze(['manual', 'api', 'rss', 'owned_feed', 'html_crawl']);
const SOURCE_TYPES = Object.freeze(['my_list', 'partner_export', 'api', 'rss', 'owned_feed', 'other']);
const APPROVAL_STATUSES = Object.freeze(['draft', 'pending', 'approved', 'rejected']);

function cleanText(value, limit = 500) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function cleanBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function isBlockedIpv4(hostname) {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  const [first, second, third] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && (second === 0 || second === 168))
    || (first === 198 && (second === 18 || second === 19 || second === 51))
    || (first === 203 && second === 0 && third === 113)
    || first >= 224;
}

function isBlockedIpv6(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return host === '::'
    || host === '::1'
    || host.startsWith('fc')
    || host.startsWith('fd')
    || /^fe[89ab]/.test(host)
    || /^::ffff:(?:127|10|0)\./.test(host)
    || /^::ffff:192\.168\./.test(host)
    || /^::ffff:172\.(?:1[6-9]|2\d|3[01])\./.test(host)
    || /^::ffff:169\.254\./.test(host);
}

function publicHttpsFeedUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const blockedHostname = host === 'localhost'
      || host.endsWith('.localhost')
      || host.endsWith('.local')
      || host.endsWith('.internal')
      || host.endsWith('.nip.io')
      || host.endsWith('.sslip.io')
      || host.endsWith('.xip.io');
    if (url.protocol !== 'https:' || url.username || url.password || blockedHostname || isBlockedIpv4(host) || isBlockedIpv6(host)) return null;
    return url.toString();
  } catch (_) {
    return null;
  }
}

export function normalizeLeadSourceInput(body = {}) {
  const name = cleanText(body.name, 120);
  const mode = cleanText(body.mode, 30).toLowerCase();
  const sourceType = cleanText(body.source_type || body.sourceType, 30).toLowerCase();
  const approvalStatus = cleanText(body.approval_status || body.approvalStatus, 30).toLowerCase() || 'draft';
  if (!name) return { error: 'A source name is required.' };
  if (!SOURCE_MODES.includes(mode)) return { error: 'Select a supported source mode.' };
  if (!SOURCE_TYPES.includes(sourceType)) return { error: 'Select a supported source type.' };
  if (!APPROVAL_STATUSES.includes(approvalStatus)) return { error: 'Select a valid approval status.' };

  const feedUrl = cleanText(body.feed_url || body.feedUrl, 1000);
  if (feedUrl && !publicHttpsFeedUrl(feedUrl)) return { error: 'Feed URLs must use public HTTPS endpoints without embedded credentials.' };

  const fieldMapping = body.field_mapping || body.fieldMapping || {};
  if (typeof fieldMapping !== 'object' || Array.isArray(fieldMapping)) return { error: 'Field mapping must be an object.' };
  return {
    name,
    sourceType,
    vertical: cleanText(body.vertical, 80),
    mode,
    approvalStatus,
    hasOwnerPermission: cleanBoolean(body.has_owner_permission ?? body.hasOwnerPermission),
    robotsAllowsCrawl: cleanBoolean(body.robots_allows_crawl ?? body.robotsAllowsCrawl),
    feedUrl,
    fieldMapping,
    maxRequestsPerMinute: Math.max(1, Math.min(60, Number.parseInt(body.max_requests_per_minute ?? body.maxRequestsPerMinute ?? '1', 10) || 1)),
    maxConcurrent: Math.max(1, Math.min(5, Number.parseInt(body.max_concurrent ?? body.maxConcurrent ?? '1', 10) || 1)),
    crawlWindow: cleanText(body.crawl_window || body.crawlWindow, 80),
    ownerContact: cleanText(body.owner_contact || body.ownerContact, 160),
  };
}

export function sourceReadiness(source = {}) {
  const mode = cleanText(source.mode, 30).toLowerCase();
  const approved = cleanText(source.approval_status || source.approvalStatus, 30).toLowerCase() === 'approved';
  const hasPermission = cleanBoolean(source.has_owner_permission ?? source.hasOwnerPermission);
  const robotsAllowed = cleanBoolean(source.robots_allows_crawl ?? source.robotsAllowsCrawl);
  const feedUrl = cleanText(source.feed_url || source.feedUrl, 1000);
  if (mode === 'manual') return { pipeline: 'manual_csv', ready: true, reason: 'Manual source ready for secure import.' };
  if (['api', 'rss', 'owned_feed'].includes(mode)) {
    if (!approved) return { pipeline: 'manual_csv', ready: false, reason: 'Approval is required before automated intake.' };
    if (!feedUrl) return { pipeline: 'approved_automated', ready: false, reason: 'A documented HTTPS feed or API URL is required.' };
    if (!publicHttpsFeedUrl(feedUrl)) return { pipeline: 'approved_automated', ready: false, reason: 'The feed URL must be a public HTTPS endpoint without embedded credentials.' };
    return { pipeline: 'approved_automated', ready: true, reason: 'Approved source is ready for rate-limited intake.' };
  }
  if (mode === 'html_crawl') {
    if (!approved || !hasPermission || !robotsAllowed) return { pipeline: 'manual_csv', ready: false, reason: 'Approved status, owner permission, and robots authorization are required before a crawler can be scheduled.' };
    return { pipeline: 'dedicated_crawler', ready: false, reason: 'Authorized crawler source is recorded and awaits the dedicated crawler service.' };
  }
  return { pipeline: 'manual_csv', ready: false, reason: 'Source mode is not configured.' };
}

export function applyFieldMapping(row = {}, mapping = {}) {
  const field = (name) => {
    const key = cleanText(mapping[name], 120);
    return key ? row[key] : row[name];
  };
  return {
    title: field('title') || field('job_type') || field('name'),
    name: field('name'),
    address: field('address'),
    contact: field('contact') || field('contact_info'),
    jobType: field('job_type'),
    notes: field('notes') || field('description'),
    city: field('city'),
    province: field('province'),
    postalCode: field('postal_code'),
    sourceUrl: field('source_url'),
  };
}

export function normalizeImportedLead(row = {}, mapping = {}) {
  const mapped = applyFieldMapping(row, mapping);
  const title = cleanText(mapped.title, 300);
  const name = cleanText(mapped.name, 160);
  const address = cleanText(mapped.address, 260);
  const contact = cleanText(mapped.contact, 320);
  const jobType = cleanText(mapped.jobType, 160);
  const notes = cleanText(mapped.notes, 2000);
  if (!title && !name && !jobType) return { error: 'Each lead needs a name, title, or job type.' };
  if (!address && !contact) return { error: 'Each lead needs an address or contact detail for validation.' };
  return {
    title: title || `${jobType || 'Service'} lead${name ? ` — ${name}` : ''}`,
    description: notes,
    name,
    address,
    contact,
    jobType,
    city: cleanText(mapped.city, 100),
    province: cleanText(mapped.province, 80),
    postalCode: cleanText(mapped.postalCode, 32),
    sourceUrl: cleanText(mapped.sourceUrl, 1000),
  };
}

function decodeXml(value = '') {
  return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function xmlField(item, name) {
  const found = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return found ? decodeXml(found[1]).replace(/<[^>]*>/g, '').trim() : '';
}

export function parseApprovedFeed(content, contentType = '') {
  const text = String(content || '').trim();
  if (!text) return [];
  if (contentType.includes('json') || text.startsWith('{') || text.startsWith('[')) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.leads || parsed.items || parsed.data || [];
    return Array.isArray(rows) ? rows.slice(0, 100) : [];
  }
  const items = text.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return items.slice(0, 100).map((item) => ({
    title: xmlField(item, 'title'),
    description: xmlField(item, 'description') || xmlField(item, 'content'),
    source_url: xmlField(item, 'link'),
    posted_at: xmlField(item, 'pubDate') || xmlField(item, 'published'),
  }));
}
