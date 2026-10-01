// ─────────────────────────────────────────────────────────────────────────────
// LINX Recon — Fraud & Scam Signal Intelligence
// Aggregates PUBLIC, no-key signals only: DNS-over-HTTPS, RDAP, crt.sh
// certificate transparency, and ip-api.com geolocation. No login, no port
// scans, no credential testing, no breach-data lookups, no non-public
// personal data. Every signal carries its own confidence and weight so the
// final score is explainable, not a black box.
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 9000;

async function fetchJson(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function doh(host, type) {
  const payload = await fetchJson(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
    { headers: { Accept: 'application/dns-json' } }
  );
  return payload.Answer || [];
}

// ── Small bundled reference data (no external key needed) ────────────────────

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'yopmail.com', 'throwawaymail.com', 'trashmail.com', 'dispostable.com',
  'getnada.com', 'temp-mail.org', 'mohmal.com', 'sharklasers.com',
  'grr.la', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
  'fakeinbox.com', 'maildrop.cc', 'mintemail.com', 'mytempemail.com',
  'emailondeck.com', 'harakirimail.com', 'incognitomail.org', 'anonymbox.com',
  'binkmail.com', 'bobmail.info', 'chammy.info', 'devnullmail.com',
  'dudmail.com', 'e4ward.com', 'gishpuppy.com', 'hushmail.com',
  'jetable.org', 'kasmail.com', 'klzlk.com', 'link2mail.net',
  'mailcatch.com', 'mailmetrash.com', 'mt2015.com', 'nada.email',
  'nobulk.com', 'noclickemail.com', 'nomail.xl.cx', 'objectmail.com',
  'pookmail.com', 'rhyta.com', 's0ny.net', 'selfdestructingmail.com',
  'slopsmail.com', 'smellfear.com', 'snakemail.com', 'sneakemail.com',
  'soodonims.com', 'spambox.us', 'spamcero.com', 'spaml.com',
  'superrito.com', 'teleworm.us', 'thankyou2010.com', 'trash2009.com',
  'trashymail.com', 'tyldd.com', 'uggsrock.com', 'wegwerfmail.de',
  'xoxy.net', 'yodmail.com', 'zehnminutenmail.de', 'zippymail.info',
]);

const FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'live.ca', 'msn.com', 'yahoo.com', 'yahoo.ca', 'ymail.com', 'rocketmail.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'tutanota.com', 'zoho.com', 'gmx.com', 'gmx.net', 'mail.com', 'inbox.com',
]);

const ROLE_ACCOUNTS = new Set([
  'admin', 'administrator', 'support', 'help', 'info', 'contact', 'sales',
  'billing', 'accounts', 'abuse', 'postmaster', 'webmaster', 'noreply',
  'no-reply', 'donotreply', 'service', 'services', 'team', 'hello',
  'office', 'mail', 'email', 'marketing', 'press', 'media', 'jobs',
  'careers', 'hr', 'legal', 'compliance', 'security', 'privacy',
]);

const RISKY_TLDS = new Set([
  'tk', 'ml', 'ga', 'cf', 'gq',          // free Freenom TLDs, heavily abused
  'top', 'xyz', 'buzz', 'click', 'link', 'work', 'party', 'gdn',
  'country', 'stream', 'download', 'racing', 'win', 'bid', 'cricket',
  'date', 'faith', 'loan', 'men', 'review', 'trade', 'webcam',
]);

// NANP (North America) area codes → region. Covers all Canadian NPAs and the
// most-used US ones; unknown NPA is itself a signal.
const NPA_REGIONS = {
  204: 'Manitoba', 226: 'Ontario (SW)', 236: 'British Columbia', 249: 'Ontario (N)',
  250: 'British Columbia', 289: 'Ontario (Golden Horseshoe)', 306: 'Saskatchewan',
  343: 'Ontario (E)', 365: 'Ontario (Golden Horseshoe)', 367: 'Quebec (E)',
  403: 'Alberta (S)', 416: 'Toronto, ON', 418: 'Quebec (E)', 431: 'Manitoba',
  437: 'Toronto, ON', 438: 'Montreal, QC', 450: 'Quebec (Montreal suburbs)',
  506: 'New Brunswick', 514: 'Montreal, QC', 519: 'Ontario (SW)', 548: 'Ontario (SW)',
  579: 'Quebec', 581: 'Quebec (E)', 587: 'Alberta', 604: 'British Columbia (Lower Mainland)',
  613: 'Ontario (E)', 639: 'Saskatchewan', 647: 'Toronto, ON', 672: 'British Columbia',
  705: 'Ontario (N/Central)', 709: 'Newfoundland and Labrador', 742: 'Ontario',
  778: 'British Columbia', 780: 'Alberta (N)', 782: 'Nova Scotia/PEI', 807: 'Ontario (NW)',
  819: 'Quebec (W)', 825: 'Alberta', 867: 'Northern Canada', 873: 'Quebec',
  902: 'Nova Scotia/PEI', 905: 'Ontario (Golden Horseshoe)',
  212: 'New York, NY', 213: 'Los Angeles, CA', 214: 'Dallas, TX', 215: 'Philadelphia, PA',
  216: 'Cleveland, OH', 217: 'Illinois', 218: 'Minnesota', 224: 'Illinois',
  225: 'Louisiana', 228: 'Mississippi', 229: 'Georgia', 231: 'Michigan',
  234: 'Ohio', 239: 'Florida (SW)', 240: 'Maryland', 248: 'Michigan',
  251: 'Alabama', 252: 'North Carolina', 253: 'Washington', 254: 'Texas',
  256: 'Alabama', 260: 'Indiana', 262: 'Wisconsin', 267: 'Philadelphia, PA',
  269: 'Michigan', 270: 'Kentucky', 272: 'Pennsylvania', 274: 'Wisconsin',
  276: 'Virginia', 281: 'Houston, TX', 301: 'Maryland', 302: 'Delaware',
  303: 'Denver, CO', 304: 'West Virginia', 305: 'Miami, FL', 307: 'Wyoming',
  308: 'Nebraska', 309: 'Illinois', 310: 'Los Angeles, CA', 312: 'Chicago, IL',
  313: 'Detroit, MI', 314: 'St. Louis, MO', 315: 'New York', 316: 'Kansas',
  317: 'Indianapolis, IN', 318: 'Louisiana', 319: 'Iowa', 320: 'Minnesota',
  321: 'Florida', 323: 'Los Angeles, CA', 325: 'Texas', 330: 'Ohio',
  331: 'Illinois', 332: 'New York, NY', 334: 'Alabama', 336: 'North Carolina',
  337: 'Louisiana', 339: 'Massachusetts', 346: 'Houston, TX', 347: 'New York, NY',
  351: 'Massachusetts', 352: 'Florida', 360: 'Washington', 361: 'Texas',
  364: 'Kentucky', 369: 'California', 380: 'Ohio', 385: 'Utah',
  386: 'Florida', 401: 'Rhode Island', 402: 'Nebraska', 404: 'Atlanta, GA',
  405: 'Oklahoma', 406: 'Montana', 407: 'Orlando, FL', 408: 'San Jose, CA',
  409: 'Texas', 410: 'Maryland', 412: 'Pittsburgh, PA', 413: 'Massachusetts',
  414: 'Milwaukee, WI', 415: 'San Francisco, CA', 417: 'Missouri', 419: 'Ohio',
  423: 'Tennessee', 424: 'Los Angeles, CA', 425: 'Washington', 430: 'Texas',
  432: 'Texas', 434: 'Virginia', 435: 'Utah', 440: 'Ohio', 442: 'California',
  443: 'Maryland', 445: 'Philadelphia, PA', 447: 'Illinois', 458: 'Oregon',
  463: 'Indiana', 464: 'Illinois', 469: 'Dallas, TX', 470: 'Atlanta, GA',
  472: 'North Carolina', 475: 'Connecticut', 478: 'Georgia', 479: 'Arkansas',
  480: 'Arizona (Phoenix)', 484: 'Pennsylvania', 501: 'Arkansas', 502: 'Kentucky',
  503: 'Oregon', 504: 'New Orleans, LA', 505: 'New Mexico', 507: 'Minnesota',
  508: 'Massachusetts', 509: 'Washington', 510: 'Oakland, CA', 512: 'Austin, TX',
  513: 'Cincinnati, OH', 515: 'Iowa', 516: 'New York (Long Island)', 517: 'Michigan',
  518: 'New York', 520: 'Arizona (Tucson)', 530: 'California', 531: 'Nebraska',
  534: 'Wisconsin', 539: 'Oklahoma', 540: 'Virginia', 541: 'Oregon',
  551: 'New Jersey', 557: 'Missouri', 559: 'California', 561: 'Florida (Boca Raton)',
  562: 'California', 563: 'Iowa', 564: 'Washington', 567: 'Ohio', 570: 'Pennsylvania',
  571: 'Virginia', 572: 'Oklahoma', 573: 'Missouri', 574: 'Indiana', 575: 'New Mexico',
  580: 'Oklahoma', 582: 'Pennsylvania', 585: 'New York', 586: 'Michigan',
  601: 'Mississippi', 602: 'Phoenix, AZ', 603: 'New Hampshire', 605: 'South Dakota',
  606: 'Kentucky', 607: 'New York', 608: 'Wisconsin', 609: 'New Jersey',
  610: 'Pennsylvania', 612: 'Minneapolis, MN', 614: 'Columbus, OH', 615: 'Nashville, TN',
  616: 'Michigan', 617: 'Boston, MA', 618: 'Illinois', 619: 'San Diego, CA',
  620: 'Kansas', 623: 'Arizona', 626: 'California', 628: 'San Francisco, CA',
  629: 'Tennessee', 630: 'Illinois', 631: 'New York (Long Island)', 636: 'Missouri',
  640: 'New Jersey', 641: 'Iowa', 646: 'New York, NY', 650: 'California (Peninsula)',
  651: 'Minnesota', 657: 'California', 659: 'Alabama', 660: 'Missouri',
  661: 'California', 662: 'Mississippi', 667: 'Maryland', 669: 'San Jose, CA',
  670: 'N. Mariana Islands', 671: 'Guam', 678: 'Atlanta, GA', 679: 'Michigan',
  680: 'New York', 681: 'West Virginia', 682: 'Fort Worth, TX', 684: 'American Samoa',
  689: 'Orlando, FL', 701: 'North Dakota', 702: 'Las Vegas, NV', 703: 'Virginia',
  704: 'North Carolina', 706: 'Georgia', 707: 'California', 708: 'Illinois',
  710: 'US Government', 712: 'Iowa', 713: 'Houston, TX', 714: 'California (Orange County)',
  715: 'Wisconsin', 716: 'Buffalo, NY', 717: 'Pennsylvania', 718: 'New York, NY',
  719: 'Colorado', 720: 'Denver, CO', 724: 'Pennsylvania', 725: 'Las Vegas, NV',
  726: 'New York', 727: 'Florida (Tampa)', 730: 'Illinois', 731: 'Tennessee',
  732: 'New Jersey', 734: 'Michigan', 737: 'Austin, TX', 740: 'Ohio',
  743: 'North Carolina', 747: 'Los Angeles, CA', 754: 'Florida (Broward)', 757: 'Virginia',
  758: 'St. Lucia', 760: 'California', 762: 'Georgia', 763: 'Minnesota',
  765: 'Indiana', 767: 'Dominica', 769: 'Mississippi', 770: 'Atlanta, GA',
  772: 'Florida', 773: 'Chicago, IL', 774: 'Massachusetts', 775: 'Nevada',
  776: 'US (toll-free)', 778: 'British Columbia', 779: 'Illinois', 781: 'Massachusetts',
  784: 'St. Vincent/Grenadines', 785: 'Kansas', 786: 'Miami, FL', 787: 'Puerto Rico',
  801: 'Utah', 802: 'Vermont', 803: 'South Carolina', 804: 'Virginia',
  805: 'California', 806: 'Texas', 808: 'Hawaii', 810: 'Michigan',
  812: 'Indiana', 813: 'Tampa, FL', 814: 'Pennsylvania', 815: 'Illinois',
  816: 'Kansas City, MO', 817: 'Fort Worth, TX', 818: 'Los Angeles, CA', 820: 'California',
  828: 'North Carolina', 830: 'Texas', 831: 'California', 832: 'Houston, TX',
  835: 'Pennsylvania', 838: 'New York', 839: 'South Carolina', 840: 'California',
  843: 'South Carolina', 845: 'New York', 847: 'Illinois', 848: 'New Jersey',
  850: 'Florida (Panhandle)', 854: 'Texas', 856: 'New Jersey', 857: 'Boston, MA',
  858: 'San Diego, CA', 859: 'Kentucky', 860: 'Connecticut', 862: 'New Jersey',
  863: 'Florida', 864: 'South Carolina', 865: 'Tennessee', 870: 'Arkansas',
  872: 'Chicago, IL', 878: 'Pittsburgh, PA', 901: 'Memphis, TN', 903: 'Texas',
  904: 'Jacksonville, FL', 906: 'Michigan', 907: 'Alaska', 908: 'New Jersey',
  909: 'California', 910: 'North Carolina', 912: 'Georgia', 913: 'Kansas',
  914: 'New York (Westchester)', 915: 'El Paso, TX', 916: 'Sacramento, CA', 917: 'New York, NY',
  918: 'Oklahoma', 919: 'North Carolina', 920: 'Wisconsin', 925: 'California',
  928: 'Arizona', 929: 'New York, NY', 930: 'Indiana', 931: 'Tennessee',
  934: 'New York (Long Island)', 935: 'California', 936: 'Texas', 937: 'Ohio',
  938: 'Alabama', 939: 'Puerto Rico', 940: 'Texas', 941: 'Florida (Sarasota)',
  945: 'Dallas, TX', 947: 'Michigan', 949: 'California (Orange County)', 951: 'California',
  952: 'Minnesota', 954: 'Florida (Broward)', 956: 'Texas', 957: 'New Mexico',
  959: 'Connecticut', 970: 'Colorado', 971: 'Oregon', 972: 'Dallas, TX',
  973: 'New Jersey', 975: 'Missouri', 978: 'Massachusetts', 979: 'Texas',
  980: 'North Carolina', 984: 'North Carolina', 985: 'Louisiana', 986: 'Idaho',
  989: 'Michigan',
  // Service codes (not geographic — flagged by their own signals, listed here
  // so they are not misreported as "unlisted area code")
  800: 'Toll-free (NANP)', 833: 'Toll-free (NANP)', 844: 'Toll-free (NANP)',
  855: 'Toll-free (NANP)', 866: 'Toll-free (NANP)', 877: 'Toll-free (NANP)',
  888: 'Toll-free (NANP)', 900: 'Premium-rate (NANP)', 976: 'Premium-rate (NANP)',
};

// ── Signal plumbing ──────────────────────────────────────────────────────────

function signal(key, label, value, detail, risk, weight, confidence = 'high') {
  return { key, label, value, detail, risk: Math.max(0, Math.min(100, Math.round(risk))), weight, confidence };
}

function scoreSignals(signals) {
  let num = 0, den = 0, maxRisk = 0;
  for (const s of signals) { num += s.risk * s.weight; den += s.weight; if (s.risk > maxRisk) maxRisk = s.risk; }
  let score = den ? Math.round(num / den) : 0;
  // A single critical finding sets a floor — one strong fraud signal should
  // never average out to "low risk".
  if (maxRisk >= 85) score = Math.max(score, 35);
  else if (maxRisk >= 70) score = Math.max(score, 25);
  const level = score >= 80 ? 'severe' : score >= 55 ? 'high' : score >= 25 ? 'elevated' : 'low';
  return { score, level };
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
}

function maskPhone(digits) {
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}

function daysSince(isoDate) {
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

async function rdapDomain(host) {
  try {
    const payload = await fetchJson(`https://rdap.org/domain/${encodeURIComponent(host)}`, {
      headers: { Accept: 'application/rdap+json, application/json' },
    });
    const events = payload.events || [];
    const reg = events.find(e => e.eventAction === 'registration');
    return { available: true, handle: String(payload.handle || ''), registrationDate: reg ? reg.eventDate : null };
  } catch (_) {
    return { available: false, handle: '', registrationDate: null };
  }
}

async function crtshFirstSeen(domain) {
  try {
    const rows = await fetchJson(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`);
    if (!Array.isArray(rows) || !rows.length) return { certs: 0, firstSeen: null, issuers: [] };
    let first = null;
    const issuers = new Set();
    for (const r of rows) {
      const d = Date.parse(r.not_before);
      if (!Number.isNaN(d) && (first === null || d < first)) first = d;
      if (r.issuer_name) issuers.add(String(r.issuer_name).slice(0, 80));
    }
    return { certs: rows.length, firstSeen: first ? new Date(first).toISOString() : null, issuers: [...issuers].slice(0, 5) };
  } catch (_) {
    return { certs: 0, firstSeen: null, issuers: [], unavailable: true };
  }
}

async function geoIp(ip) {
  const data = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`
  );
  if (data.status !== 'success') throw new Error(data.message || 'Geo lookup failed.');
  return data;
}

function isPublicIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return false;
  const [a, b] = parts;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127));
}

function isPublicIPv6(ip) {
  if (!/^[0-9a-f:]+$/i.test(ip) || !ip.includes(':')) return false;
  const low = ip.toLowerCase();
  return !(low === '::1' || low.startsWith('fe80:') || low.startsWith('fc00:') || low.startsWith('fd00:') || low.startsWith('ff00:'));
}

// ── Email scan ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export async function scanEmail(raw) {
  const value = String(raw || '').trim().slice(0, 254).toLowerCase();
  if (!EMAIL_RE.test(value)) throw new Error('Enter a valid email address.');
  const [local, domain] = value.split('@');
  const tld = domain.split('.').pop();

  const [mxAnswer, rdap] = await Promise.allSettled([doh(domain, 'MX'), rdapDomain(domain)]);
  const mx = mxAnswer.status === 'fulfilled' ? mxAnswer.value.filter(r => r.type === 15).map(r => String(r.data || '').replace(/\.$/, '')).slice(0, 5) : [];
  const mxFailed = mxAnswer.status !== 'fulfilled';
  const rd = rdap.status === 'fulfilled' ? rdap.value : { available: false, registrationDate: null };
  const ageDays = rd.registrationDate ? daysSince(rd.registrationDate) : null;

  const signals = [];
  signals.push(signal('format', 'Address format', 'valid',
    'The address passes standard email syntax checks.', 0, 1));

  signals.push(signal('mx', 'Receiving mail servers', mx.length ? `${mx.length} MX record${mx.length > 1 ? 's' : ''}` : (mxFailed ? 'lookup failed' : 'none found'),
    mx.length ? `Mail exchangers: ${mx.join(', ')}` : 'No MX records were returned for this domain. Addresses on domains without mail servers cannot receive mail.',
    mxFailed ? 40 : mx.length ? 0 : 85, 3, mxFailed ? 'low' : 'high'));

  const disposable = DISPOSABLE_DOMAINS.has(domain);
  signals.push(signal('disposable', 'Disposable address', disposable ? 'yes' : 'no',
    disposable ? 'This domain is a known disposable/temporary email provider. Frequently used to evade identification.' : 'Not on the bundled disposable-provider list.',
    disposable ? 78 : 0, 3));

  const free = FREE_PROVIDERS.has(domain);
  signals.push(signal('provider', 'Provider class', free ? 'free mailbox provider' : 'custom/private domain',
    free ? 'Free mailbox providers are legitimate but offer no organizational identity signal.' : 'Custom domain — organizational identity can be checked via the domain scan.',
    free ? 15 : 0, 1));

  const role = ROLE_ACCOUNTS.has(local);
  signals.push(signal('role', 'Role account', role ? 'yes' : 'no',
    role ? `The local part "${local}" is a generic role account, not a named person.` : 'Addressed to a named local part.',
    role ? 25 : 0, 1));

  if (ageDays === null) {
    signals.push(signal('domain_age', 'Domain age', rd.available ? 'unknown' : 'RDAP unavailable',
      'Registration date could not be determined from public RDAP.', 30, 1.5, 'low'));
  } else {
    const risk = ageDays < 30 ? 82 : ageDays < 365 ? 45 : ageDays < 730 ? 20 : 5;
    signals.push(signal('domain_age', 'Domain age', ageDays < 1 ? 'registered today' : `${ageDays} days`,
      `Domain registered ${new Date(rd.registrationDate).toISOString().slice(0, 10)}. Newly registered domains are a classic scam signal.`,
      risk, 3));
  }

  const riskyTld = RISKY_TLDS.has(tld);
  signals.push(signal('tld', 'Top-level domain', `.${tld}${riskyTld ? ' — high-abuse' : ''}`,
    riskyTld ? 'This TLD appears disproportionately in fraud and phishing infrastructure.' : 'No elevated abuse association for this TLD.',
    riskyTld ? 40 : 0, 1.5));

  const { score, level } = scoreSignals(signals);
  const indicators = [];
  if (disposable) indicators.push('Disposable email provider — treat identity claims with skepticism.');
  if (!mx.length && !mxFailed) indicators.push('Domain has no MX records — this address cannot receive mail.');
  if (ageDays !== null && ageDays < 30) indicators.push(`Domain registered ${ageDays} day${ageDays === 1 ? '' : 's'} ago — very new.`);
  if (riskyTld) indicators.push('High-abuse TLD.');
  return finishReport('email', value, maskEmail(value), signals, indicators, score, level);
}

// ── Phone scan ───────────────────────────────────────────────────────────────

export async function scanPhone(raw) {
  const cleaned = String(raw || '').trim().replace(/[^\d+]/g, '').slice(0, 20);
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) throw new Error('Enter a phone number with 7–15 digits.');

  const signals = [];
  let region = 'Unknown region';
  let country = 'Unknown';

  if (digits.length === 10 || (digits.length === 11 && digits[0] === '1')) {
    // NANP (US/CA/Caribbean)
    country = 'North America (NANP)';
    const national = digits.length === 11 ? digits.slice(1) : digits;
    const npa = Number(national.slice(0, 3));
    const nxx = national.slice(3, 6);
    const npaValid = npa >= 200 && npa <= 999 && !/^(37|96)/.test(String(npa));
    region = NPA_REGIONS[npa] || 'Unlisted area code';
    signals.push(signal('nanp', 'NANP structure', npaValid ? 'valid' : 'invalid',
      npaValid ? `Area code ${npa} is a valid NANP code.` : `Area code ${npa} is not a valid assignable NANP code.`,
      npaValid ? 0 : 88, 3));
    signals.push(signal('region', 'Number region', region,
      NPA_REGIONS[npa] ? `Area code ${npa} maps to ${region}.` : 'Area code is not in the reference table — possible unassigned or newly issued code.',
      NPA_REGIONS[npa] ? 0 : 45, 2, NPA_REGIONS[npa] ? 'high' : 'medium'));
    const nxxBad = /^[01]/.test(nxx);
    if (/^[01]/.test(nxx)) {
      signals.push(signal('exchange', 'Exchange code', `${nxx} — invalid`,
        'Exchange codes cannot begin with 0 or 1. This number cannot be dialed as written.', 85, 2));
    } else {
      signals.push(signal('exchange', 'Exchange code', `${nxx} — plausible`, 'Exchange code follows NANP dialing rules.', 0, 1));
    }
    const premium = /^(900|976)/.test(national);
    signals.push(signal('premium', 'Premium/service number', premium ? 'yes' : 'no',
      premium ? 'Premium-rate numbers are a known vector for phone scams.' : 'Not a premium-rate range.',
      premium ? 75 : 0, 3));
    const fictional = nxx === '555' && Number(national.slice(6)) >= 100 && Number(national.slice(6)) <= 199;
    signals.push(signal('fictional', 'Fictional range', fictional ? 'yes — 555-01XX' : 'no',
      fictional ? '555-0100–0199 is reserved for fictional use. Real callers do not dial from it.' : 'Not in the reserved fictional range.',
      fictional ? 70 : 0, 2));
    const tollfree = /^(800|833|844|855|866|877|888)/.test(String(npa));
    signals.push(signal('tollfree', 'Toll-free', tollfree ? 'yes' : 'no',
      tollfree ? 'Toll-free numbers hide geographic origin — common in legitimate business and in scams alike.' : 'Geographic number.',
      tollfree ? 20 : 0, 1));
  } else {
    // International E.164
    const ccDigits = digits.length > 12 ? digits.slice(0, 3) : digits.length > 11 ? digits.slice(0, 2) : digits[0];
    country = `Country code +${ccDigits}`;
    signals.push(signal('e164', 'E.164 structure', 'plausible',
      `${digits.length} digits — within the E.164 international format. Detailed numbering-plan analysis is bundled for NANP only.`,
      10, 1, 'medium'));
  }

  signals.push(signal('length', 'Digit count', `${digits.length} digits`,
    digits.length >= 10 ? 'Full international-format length.' : 'Short number — may be incomplete or a local-only format.',
    digits.length >= 10 ? 0 : 35, 1.5));

  const repeated = /^(\d)\1{6,}$/.test(digits) || /^(1234567|7654321)/.test(digits);
  signals.push(signal('pattern', 'Suspicious pattern', repeated ? 'yes' : 'no',
    repeated ? 'Sequential or repeated digits are typical of fabricated numbers.' : 'No obvious fabrication pattern.',
    repeated ? 60 : 0, 1.5));

  const { score, level } = scoreSignals(signals);
  const indicators = [];
  if (region === 'Unlisted area code') indicators.push('Area code not in the reference table.');
  return finishReport('phone', cleaned, maskPhone(digits), signals, indicators, score, level, { region, country });
}

// ── Domain scan ──────────────────────────────────────────────────────────────

export async function scanDomain(raw) {
  let host = String(raw || '').trim().slice(0, 253).toLowerCase().replace(/^https?:\/\//i, '').split('/')[0].replace(/\.$/, '');
  if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host)) {
    throw new Error('Enter a valid public domain name.');
  }
  const tld = host.split('.').pop();

  const [aAns, mxAns, rdap, certs, http] = await Promise.allSettled([
    doh(host, 'A'), doh(host, 'MX'), rdapDomain(host), crtshFirstSeen(host),
    fetch(`https://${host}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'User-Agent': 'LINX-Recon/1.0 (+https://linxservices.ca)' } }),
  ]);

  const a = aAns.status === 'fulfilled' ? aAns.value.filter(r => r.type === 1).map(r => r.data).slice(0, 6) : [];
  const mx = mxAns.status === 'fulfilled' ? mxAns.value.filter(r => r.type === 15).map(r => String(r.data || '').replace(/\.$/, '')).slice(0, 5) : [];
  const rd = rdap.status === 'fulfilled' ? rdap.value : { available: false, registrationDate: null };
  const ct = certs.status === 'fulfilled' ? certs.value : { certs: 0, firstSeen: null, issuers: [], unavailable: true };
  const ageDays = rd.registrationDate ? daysSince(rd.registrationDate) : null;
  const certAgeDays = ct.firstSeen ? daysSince(ct.firstSeen) : null;

  const signals = [];
  signals.push(signal('dns', 'DNS resolution', a.length ? `${a.length} A record${a.length > 1 ? 's' : ''}` : 'no A records',
    a.length ? `Resolves to ${a.join(', ')}` : 'Domain does not resolve to an IPv4 address.',
    a.length ? 0 : 70, 2.5));
  signals.push(signal('mx', 'Mail infrastructure', mx.length ? `${mx.length} MX record${mx.length > 1 ? 's' : ''}` : 'none',
    mx.length ? mx.join(', ') : 'No mail servers published.',
    mx.length ? 0 : 25, 1));

  if (ageDays === null) {
    signals.push(signal('domain_age', 'Domain age', 'unknown', 'Registration date unavailable from public RDAP.', 30, 2, 'low'));
  } else {
    signals.push(signal('domain_age', 'Domain age', ageDays < 1 ? 'registered today' : `${ageDays} days`,
      `Registered ${new Date(rd.registrationDate).toISOString().slice(0, 10)}.`,
      ageDays < 30 ? 82 : ageDays < 365 ? 45 : ageDays < 730 ? 20 : 5, 3));
  }

  if (certAgeDays === null) {
    signals.push(signal('cert', 'TLS history', ct.unavailable ? 'lookup failed' : 'no certificates found',
      'No certificates in public transparency logs — unusual for an active website.', ct.unavailable ? 25 : 55, 2, 'medium'));
  } else {
    signals.push(signal('cert', 'TLS history', `${ct.certs} cert${ct.certs === 1 ? '' : 's'}, oldest ${certAgeDays}d`,
      `First seen ${new Date(ct.firstSeen).toISOString().slice(0, 10)}${ct.issuers.length ? ` · issuers: ${ct.issuers.join('; ')}` : ''}.`,
      certAgeDays < 30 ? 55 : certAgeDays < 365 ? 25 : 5, 2.5));
  }

  const riskyTld = RISKY_TLDS.has(tld);
  signals.push(signal('tld', 'Top-level domain', `.${tld}${riskyTld ? ' — high-abuse' : ''}`,
    riskyTld ? 'TLD appears disproportionately in fraud infrastructure.' : 'No elevated abuse association.',
    riskyTld ? 40 : 0, 1.5));

  let redirectNote = 'single response';
  let redirectRisk = 0;
  if (http.status === 'fulfilled') {
    const loc = http.value.headers.get('location') || '';
    if (http.value.status >= 300 && http.value.status < 400 && loc) {
      try {
        const dest = new URL(loc, `https://${host}`).hostname.toLowerCase();
        redirectNote = `redirects to ${dest}`;
        if (dest !== host && !dest.endsWith(`.${host}`)) { redirectRisk = 45; redirectNote += ' — different domain'; }
      } catch (_) { redirectNote = 'redirect (unparseable)'; }
    } else {
      redirectNote = `HTTP ${http.value.status}`;
      if (http.value.status >= 500) redirectRisk = 30;
    }
  } else {
    redirectNote = 'no HTTPS response';
    redirectRisk = 35;
  }
  signals.push(signal('https', 'HTTPS behaviour', redirectNote, 'One unauthenticated HEAD request.', redirectRisk, 1.5, 'medium'));

  const { score, level } = scoreSignals(signals);
  const indicators = [];
  if (ageDays !== null && ageDays < 30) indicators.push(`Domain only ${ageDays} day${ageDays === 1 ? '' : 's'} old.`);
  if (certAgeDays !== null && certAgeDays < 30) indicators.push('TLS certificate is very new.');
  if (riskyTld) indicators.push('High-abuse TLD.');
  if (!a.length) indicators.push('Does not resolve — cannot host an active site.');
  return finishReport('domain', host, host, signals, indicators, score, level, { ips: a });
}

// ── IP scan ──────────────────────────────────────────────────────────────────

export async function scanIp(raw) {
  const ip = String(raw || '').trim().slice(0, 45);
  const v4 = isPublicIPv4(ip);
  const v6 = isPublicIPv6(ip);
  if (!v4 && !v6) throw new Error('Enter a valid public IPv4 or IPv6 address.');

  let geo;
  try {
    geo = await geoIp(ip);
  } catch (e) {
    throw new Error('Geolocation source did not return data for this address.');
  }

  const signals = [];
  signals.push(signal('geo', 'Geolocation', `${geo.city || 'Unknown city'}, ${geo.regionName || ''} ${geo.country || ''}`.trim(),
    `Coordinates ${geo.lat}, ${geo.lon} · timezone ${geo.timezone || 'unknown'} · postal ${geo.zip || 'unknown'}.`,
    0, 1, 'medium'));
  signals.push(signal('network', 'Network', `${geo.isp || 'unknown ISP'}`,
    `Organization: ${geo.org || 'unknown'} · ${geo.as || 'ASN unknown'}.`,
    0, 1, 'medium'));

  const netText = `${geo.isp || ''} ${geo.org || ''} ${geo.as || ''}`.toLowerCase();
  const hostingKw = /(hosting|cloud|datacenter|data center|vps|server|cdn|colocation|digitalocean|aws|amazon|google|microsoft|azure|ovh|hetzner|linode|vultr|leaseweb|godaddy)/.test(netText);
  const hostingFlag = geo.hosting === true;
  signals.push(signal('hosting', 'Hosting / datacenter', hostingFlag || hostingKw ? 'yes' : 'no',
    hostingFlag ? 'Geolocation provider flags this address as hosting infrastructure.' : hostingKw ? 'Network name suggests datacenter/hosting use.' : 'No hosting indicators from the geolocation source.',
    hostingFlag || hostingKw ? 45 : 0, 2.5, hostingFlag ? 'high' : 'medium'));

  signals.push(signal('proxy', 'Known proxy / VPN exit', geo.proxy === true ? 'flagged' : 'not flagged',
    geo.proxy === true ? 'Geolocation provider flags this address as a proxy or anonymizer exit.' : 'Not flagged as a proxy by the geolocation source.',
    geo.proxy === true ? 65 : 0, 2.5, 'medium'));

  const { score, level } = scoreSignals(signals);
  const indicators = [];
  if (geo.proxy === true) indicators.push('Flagged as proxy/VPN exit — origin is obscured.');
  if (hostingFlag || hostingKw) indicators.push('Datacenter/hosting address — not a residential endpoint.');
  return finishReport('ip', ip, ip, signals, indicators, score, level, {
    geo: { country: geo.country, countryCode: geo.countryCode, region: geo.regionName, city: geo.city, lat: geo.lat, lon: geo.lon, timezone: geo.timezone, isp: geo.isp, org: geo.org, asn: geo.as },
  });
}

// ── Report assembly ──────────────────────────────────────────────────────────

function finishReport(type, value, masked, signals, indicators, score, level, extra = {}) {
  const byBand = { critical: 0, warning: 0, info: 0 };
  for (const s of signals) {
    if (s.risk >= 55) byBand.critical++;
    else if (s.risk >= 25) byBand.warning++;
    else byBand.info++;
  }
  return {
    type,
    value,
    masked,
    score,
    level,
    signals,
    indicators,
    analytics: {
      signal_count: signals.length,
      critical: byBand.critical,
      warning: byBand.warning,
      info: byBand.info,
      avg_confidence: ['high', 'medium', 'low'][Math.min(2, Math.round(signals.reduce((n, s) => n + ({ high: 0, medium: 1, low: 2 }[s.confidence] || 0), 0) / Math.max(1, signals.length)))],
    },
    generated_at: new Date().toISOString(),
    methodology: 'Public, no-key sources only: DNS-over-HTTPS, RDAP registration data, crt.sh certificate transparency, ip-api.com geolocation, and bundled numbering/email reference lists. Signals are scored 0–100 and combined by weight; a single critical finding sets a floor so it cannot average out to low risk. No login, port scans, credential testing, breach-data lookups, or retained scan history.',
    disclaimer: 'Risk signals are heuristic observations from public data — not a fraud determination, identity verification, or legal finding. Validate through your own process before acting.',
    ...extra,
  };
}

export async function runFraudScan(type, value) {
  const t = String(type || '').toLowerCase();
  if (t === 'email') return scanEmail(value);
  if (t === 'phone') return scanPhone(value);
  if (t === 'domain') return scanDomain(value);
  if (t === 'ip') return scanIp(value);
  throw new Error("Scan type must be one of: email, phone, domain, ip.");
}
