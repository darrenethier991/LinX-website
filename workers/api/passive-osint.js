const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal']);

function isPrivateIPv4(host) {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

export function normalizePassiveTarget(value) {
  const raw = typeof value === 'string' ? value.trim().slice(0, 2048) : '';
  if (raw.length < 3) return { error: 'Enter a public domain or HTTPS URL.' };
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); }
  catch (_) { return { error: 'Enter a valid public domain or HTTPS URL.' }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { error: 'Only HTTP and HTTPS public domains can be observed.' };
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || isPrivateIPv4(host) || host.includes(':')) {
    return { error: 'Private, local, and IP-address targets are not allowed.' };
  }
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)) return { error: 'Enter a public registered domain name.' };
  return { host, url: url.toString(), suppliedUrl: raw };
}

function publicIps(answer = []) {
  return answer.filter(record => (record.type === 1 || record.type === 28) && typeof record.data === 'string' && !isPrivateIPv4(record.data)).map(record => record.data).slice(0, 8);
}

function dnsNames(answer = [], type) {
  return answer.filter(record => record.type === type).map(record => String(record.data || '').replace(/\.$/, '')).slice(0, 8);
}

async function doh(host, type, fetchFn) {
  const response = await fetchFn(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`, { headers: { Accept: 'application/dns-json' } });
  if (!response.ok) throw new Error(`DNS-over-HTTPS returned HTTP ${response.status}.`);
  const payload = await response.json();
  return payload.Answer || [];
}

export async function runPassiveDomainObservation(input, fetchFn = fetch) {
  const target = normalizePassiveTarget(input);
  if (target.error) throw new Error(target.error);
  const [a, aaaa, mx, ns, txt, rdap, http] = await Promise.allSettled([
    doh(target.host, 'A', fetchFn), doh(target.host, 'AAAA', fetchFn), doh(target.host, 'MX', fetchFn), doh(target.host, 'NS', fetchFn), doh(target.host, 'TXT', fetchFn),
    fetchFn(`https://rdap.org/domain/${encodeURIComponent(target.host)}`, { headers: { Accept: 'application/rdap+json, application/json' } }),
    fetchFn(`https://${target.host}`, { method: 'HEAD', redirect: 'manual', headers: { 'User-Agent': 'LINX-Passive-Observation/1.0 (+https://linxservices.ca)' } }),
  ]);
  const dns = {
    a: a.status === 'fulfilled' ? publicIps(a.value) : [],
    aaaa: aaaa.status === 'fulfilled' ? publicIps(aaaa.value) : [],
    mx: mx.status === 'fulfilled' ? dnsNames(mx.value, 15) : [],
    ns: ns.status === 'fulfilled' ? dnsNames(ns.value, 2) : [],
    txt_present: txt.status === 'fulfilled' && txt.value.some(record => record.type === 16),
  };
  let rdapSummary = { available: false, handle: '', events: [] };
  if (rdap.status === 'fulfilled' && rdap.value.ok) {
    const payload = await rdap.value.json().catch(() => ({}));
    rdapSummary = { available: true, handle: String(payload.handle || ''), events: (payload.events || []).filter(event => ['registration', 'expiration', 'last changed'].includes(event.eventAction)).map(event => ({ action: event.eventAction, date: event.eventDate })).slice(0, 4) };
  }
  const httpObservation = http.status === 'fulfilled' ? { reachable: true, status: http.value.status, redirect_to: http.value.headers.get('location') || '', server: http.value.headers.get('server') || '', content_security_policy: Boolean(http.value.headers.get('content-security-policy')) } : { reachable: false, status: null, redirect_to: '', server: '', content_security_policy: false };
  const indicators = [];
  if (!dns.a.length && !dns.aaaa.length) indicators.push('No public A or AAAA response was observed.');
  if (!httpObservation.reachable) indicators.push('The HTTPS metadata probe did not receive a response.');
  if (httpObservation.status && httpObservation.status >= 500) indicators.push('The HTTPS endpoint returned a server-error status.');
  if (!rdapSummary.available) indicators.push('Public RDAP registration metadata was not available from the selected service.');
  const reviewScore = Math.min(100, indicators.length * 18 + (httpObservation.status >= 500 ? 12 : 0));
  return {
    target: target.host,
    supplied_url: target.suppliedUrl,
    methodology: 'Passive public observations only: RDAP registration metadata, DNS-over-HTTPS answers, and one unauthenticated HTTPS HEAD request. No login, form submission, JavaScript execution, content scraping, credential testing, or scan history retention.',
    dns, rdap: rdapSummary, http: httpObservation,
    indicators,
    review: { score: reviewScore, level: reviewScore >= 50 ? 'review' : reviewScore ? 'observe' : 'clear_observations', disclaimer: 'This is not a fraud determination or a security certification. Validate results against your own authorized review process.' },
  };
}
