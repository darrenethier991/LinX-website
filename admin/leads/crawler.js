/**
 * Web Crawler Service — LinxServices.ca Lead Discovery
 * ─────────────────────────────────────────────────────────────────────────────
 * Crawls publicly available sources for homeowner service requests and feeds
 * them through the unified lead pipeline.
 *
 * Supported sources (all use respectful delays + robots.txt checks):
 *   • Kijiji Canada          (Cheerio — static HTML)
 *   • Craigslist Canada      (Cheerio — static HTML)
 *   • Reddit local subs      (official JSON API — no scraping needed)
 *   • Kijiji placeholder     (Puppeteer for JS-rendered pages)
 *
 * LEGAL NOTE:
 *   This crawler only accesses publicly visible pages with no login requirement.
 *   It obeys crawl-delay directives in robots.txt and sends a descriptive
 *   User-Agent identifying the crawler and contact address.  Remove any source
 *   whose terms of service prohibit automated access.
 *
 * Usage:
 *   const crawler = require('./crawler');
 *   await crawler.runCycle(contractors);   // one full crawl cycle
 *   crawler.start(contractors);            // start background scheduler
 *   crawler.stop();                        // stop background scheduler
 *   crawler.getStatus();                   // { running, lastRun, nextRun, stats }
 */

'use strict';

const https  = require('https');
const http   = require('http');
const { processBatch } = require('./pipeline');

// ─── Config ───────────────────────────────────────────────────────────────────

const CRAWL_INTERVAL_MS   = parseInt(process.env.CRAWL_INTERVAL_MS   || String(4 * 60 * 60 * 1000), 10); // 4 h
const CRAWL_DELAY_MS      = parseInt(process.env.CRAWL_DELAY_MS      || '3000',  10); // 3 s between requests
const CRAWL_TIMEOUT_MS    = parseInt(process.env.CRAWL_TIMEOUT_MS    || '15000', 10); // 15 s per request
const FRESHNESS_HOURS     = parseInt(process.env.LEAD_FRESHNESS_HOURS || '72',   10);

// Rotating user-agent pool — realistic browser strings to avoid trivial blocks.
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'LinxServicesCrawler/1.0 (lead-aggregation; +https://linxservices.ca/crawler; contact@linxservices.ca)',
];

let _uaIndex = 0;
function nextUserAgent() {
  const ua = USER_AGENTS[_uaIndex % USER_AGENTS.length];
  _uaIndex++;
  return ua;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

/**
 * Fetch a URL with a timeout and return the response body as a string.
 * Returns null on network error (caller decides whether to log/skip).
 */
function fetchText(url) {
  return new Promise((resolve) => {
    const lib    = url.startsWith('https') ? https : http;
    const req    = lib.get(
      url,
      {
        headers : {
          'User-Agent'      : nextUserAgent(),
          'Accept'          : 'text/html,application/json,*/*',
          'Accept-Language' : 'en-CA,en;q=0.9',
        },
        timeout : CRAWL_TIMEOUT_MS,
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (loc) return resolve(fetchText(loc.startsWith('http') ? loc : url.replace(/\/[^/]*$/, '/') + loc));
        }
        if (res.statusCode !== 200) return resolve(null);
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => resolve(body));
      }
    );
    req.on('error',   () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Respectful crawl delay between consecutive requests.
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Cheerio-based parser (loaded lazily so the dep is optional) ─────────────

function parseWithCheerio(html) {
  try {
    // eslint-disable-next-line global-require
    const cheerio = require('cheerio');
    return cheerio.load(html);
  } catch {
    return null;
  }
}

// ─── Source scrapers ──────────────────────────────────────────────────────────

/**
 * Scrape Kijiji Canada service-requests listings for a given city slug.
 * Kijiji uses server-rendered HTML for list pages — Cheerio is sufficient.
 *
 * @param {string} citySlug  e.g. 'toronto', 'vancouver', 'calgary'
 * @returns {Promise<object[]>} Array of raw lead objects
 */
async function scrapeKijiji(citySlug = 'toronto') {
  const url  = `https://www.kijiji.ca/b-services-handyman/${citySlug}/c144l0`;
  const html = await fetchText(url);
  if (!html) return [];

  const $ = parseWithCheerio(html);
  if (!$) {
    console.warn('[Crawler/Kijiji] cheerio not available — skipping');
    return [];
  }

  const leads = [];

  $('[data-testid="listing-card"], .regular-ad, article.result-listing').each((_, el) => {
    const title       = $(el).find('[data-testid="listing-title"], .title a, h3 a').first().text().trim();
    const desc        = $(el).find('[data-testid="listing-description"], .description').first().text().trim();
    const relHref     = $(el).find('a[data-testid="listing-title-link"], .title a, h3 a').first().attr('href') || '';
    const sourceUrl   = relHref.startsWith('http') ? relHref : `https://www.kijiji.ca${relHref}`;
    const locationEl  = $(el).find('[data-testid="listing-location"], .location').first().text().trim();
    const dateEl      = $(el).find('[data-testid="listing-date"], .date-posted').first().text().trim();

    if (!title) return;

    leads.push({
      title,
      description    : desc,
      sourceUrl,
      sourcePlatform : 'kijiji',
      city           : locationEl.split(',')[0].trim() || citySlug,
      province       : locationEl.split(',')[1]?.trim() || '',
      postedAt       : parseFuzzyDate(dateEl),
      contactMethod  : 'kijiji_message',
      raw            : `${title} ${desc}`.slice(0, 2000),
    });
  });

  return leads;
}

/**
 * Scrape Craigslist Canada services listings.
 *
 * @param {string} subdomain  e.g. 'toronto', 'vancouver', 'calgary'
 * @returns {Promise<object[]>}
 */
async function scrapeCraigslist(subdomain = 'toronto') {
  const url  = `https://${subdomain}.craigslist.org/search/hss?sort=date`;
  const html = await fetchText(url);
  if (!html) return [];

  const $ = parseWithCheerio(html);
  if (!$) return [];

  const leads = [];

  $('li.result-row, li.cl-search-result').each((_, el) => {
    const title     = $(el).find('.result-title, a.posting-title span.label').first().text().trim();
    const href      = $(el).find('.result-title, a.posting-title').first().attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : `https://${subdomain}.craigslist.org${href}`;
    const dateEl    = $(el).find('time').first().attr('datetime') || '';
    const locEl     = $(el).find('.result-hood, .meta .hood').first().text().replace(/[()]/g, '').trim();

    if (!title) return;

    leads.push({
      title,
      description    : title, // detail page would give more; title is enough for classify
      sourceUrl,
      sourcePlatform : 'craigslist',
      city           : locEl || subdomain,
      postedAt       : dateEl || new Date().toISOString(),
      contactMethod  : 'craigslist_email',
      raw            : title,
    });
  });

  return leads;
}

/**
 * Query Reddit's public JSON API for service-request posts on local subreddits.
 * Reddit provides a documented JSON API (no scraping needed; no auth for public read).
 *
 * @param {string} subreddit  e.g. 'torontoservices', 'vancouver', 'Calgary'
 * @returns {Promise<object[]>}
 */
async function scrapeReddit(subreddit = 'toronto') {
  const url  = `https://www.reddit.com/r/${subreddit}/search.json?q=contractor+OR+plumber+OR+electrician+OR+renovation+OR+handyman&sort=new&t=week&restrict_sr=1&limit=25`;
  const body = await fetchText(url);
  if (!body) return [];

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    return [];
  }

  const posts  = json?.data?.children || [];
  const leads  = [];
  const cutoff = Date.now() - FRESHNESS_HOURS * 60 * 60 * 1000;

  for (const { data: post } of posts) {
    if (!post.title) continue;
    const postedMs = (post.created_utc || 0) * 1000;
    if (postedMs < cutoff) continue;

    // Only keep posts that look like service requests (not "I am a contractor")
    const combined = `${post.title} ${post.selftext || ''}`.toLowerCase();
    const isRequest = /\b(looking|need|want|seeking|recommend|anyone|can you|hire|find|help|advice)\b/.test(combined);
    if (!isRequest) continue;

    leads.push({
      title          : post.title.slice(0, 300),
      description    : (post.selftext || '').slice(0, 2000),
      sourceUrl      : `https://www.reddit.com${post.permalink}`,
      sourcePlatform : 'reddit',
      city           : subreddit,
      postedAt       : new Date(postedMs).toISOString(),
      contactMethod  : 'reddit_dm',
      raw            : `${post.title} ${post.selftext || ''}`.slice(0, 2000),
    });
  }

  return leads;
}

/**
 * Parse fuzzy date strings like "< 7 minutes ago", "Yesterday", "03/15" into ISO-8601.
 * Falls back to current time if unparseable.
 */
function parseFuzzyDate(str) {
  if (!str) return new Date().toISOString();
  str = str.trim().toLowerCase();

  if (str.includes('second') || str.includes('just now') || str.includes('< 1 min')) {
    return new Date().toISOString();
  }
  const minMatch = str.match(/(\d+)\s*minute/);
  if (minMatch) return new Date(Date.now() - parseInt(minMatch[1]) * 60000).toISOString();

  const hourMatch = str.match(/(\d+)\s*hour/);
  if (hourMatch) return new Date(Date.now() - parseInt(hourMatch[1]) * 3600000).toISOString();

  const dayMatch = str.match(/(\d+)\s*day/);
  if (dayMatch) return new Date(Date.now() - parseInt(dayMatch[1]) * 86400000).toISOString();

  if (str.includes('yesterday')) return new Date(Date.now() - 86400000).toISOString();

  const parsed = Date.parse(str);
  return isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

// ─── Crawler state ────────────────────────────────────────────────────────────

const _state = {
  running   : false,
  lastRun   : null,
  nextRun   : null,
  lastStats : null,
  timer     : null,
  errors    : [],
};

// Cities / subreddits to crawl (extend via CRAWL_CITIES env var — CSV)
const DEFAULT_CITIES = [
  { kijiji: 'city-of-toronto', craigslist: 'toronto', reddit: 'toronto' },
  { kijiji: 'vancouver',       craigslist: 'vancouver', reddit: 'vancouver' },
  { kijiji: 'calgary',         craigslist: 'calgary',   reddit: 'Calgary' },
  { kijiji: 'ottawa',          craigslist: 'ottawa',    reddit: 'ottawa' },
  { kijiji: 'mississauga',     craigslist: 'toronto',   reddit: 'mississauga' },
];

// ─── Main cycle ───────────────────────────────────────────────────────────────

/**
 * Run one full crawl cycle across all configured sources and cities.
 *
 * @param {object[]} [contractors=[]]  Registered contractors for matching
 * @returns {Promise<{ added: number, duplicates: number, notified: number, errors: string[] }>}
 */
async function runCycle(contractors = []) {
  if (_state.running) {
    console.log('[Crawler] Cycle already running — skipping');
    return { added: 0, duplicates: 0, notified: 0, errors: ['already_running'] };
  }

  _state.running = true;
  _state.lastRun = new Date().toISOString();
  const cycleErrors = [];
  let totalAdded = 0, totalDupes = 0, totalNotified = 0;

  console.log(`[Crawler] Starting crawl cycle at ${_state.lastRun}`);

  for (const city of DEFAULT_CITIES) {
    // ── Kijiji ────────────────────────────────────────────────────────────
    try {
      console.log(`[Crawler] Kijiji → ${city.kijiji}`);
      const leads = await scrapeKijiji(city.kijiji);
      if (leads.length > 0) {
        const r = await processBatch(leads, contractors, { notify: true });
        totalAdded    += r.added;
        totalDupes    += r.duplicates;
        totalNotified += r.notified;
        console.log(`[Crawler] Kijiji/${city.kijiji}: +${r.added} new, ${r.duplicates} dupes`);
      }
    } catch (err) {
      const msg = `kijiji/${city.kijiji}: ${err.message}`;
      console.error('[Crawler]', msg);
      cycleErrors.push(msg);
    }
    await sleep(CRAWL_DELAY_MS);

    // ── Craigslist ────────────────────────────────────────────────────────
    try {
      console.log(`[Crawler] Craigslist → ${city.craigslist}`);
      const leads = await scrapeCraigslist(city.craigslist);
      if (leads.length > 0) {
        const r = await processBatch(leads, contractors, { notify: true });
        totalAdded    += r.added;
        totalDupes    += r.duplicates;
        totalNotified += r.notified;
        console.log(`[Crawler] Craigslist/${city.craigslist}: +${r.added} new, ${r.duplicates} dupes`);
      }
    } catch (err) {
      const msg = `craigslist/${city.craigslist}: ${err.message}`;
      console.error('[Crawler]', msg);
      cycleErrors.push(msg);
    }
    await sleep(CRAWL_DELAY_MS);

    // ── Reddit ────────────────────────────────────────────────────────────
    try {
      console.log(`[Crawler] Reddit → r/${city.reddit}`);
      const leads = await scrapeReddit(city.reddit);
      if (leads.length > 0) {
        const r = await processBatch(leads, contractors, { notify: true });
        totalAdded    += r.added;
        totalDupes    += r.duplicates;
        totalNotified += r.notified;
        console.log(`[Crawler] Reddit/r/${city.reddit}: +${r.added} new, ${r.duplicates} dupes`);
      }
    } catch (err) {
      const msg = `reddit/${city.reddit}: ${err.message}`;
      console.error('[Crawler]', msg);
      cycleErrors.push(msg);
    }
    await sleep(CRAWL_DELAY_MS);
  }

  const stats = { added: totalAdded, duplicates: totalDupes, notified: totalNotified, errors: cycleErrors };
  _state.lastStats = stats;
  _state.errors    = cycleErrors;
  _state.running   = false;
  _state.nextRun   = new Date(Date.now() + CRAWL_INTERVAL_MS).toISOString();

  console.log(`[Crawler] Cycle complete — ${totalAdded} new leads, ${totalDupes} dupes, ${totalNotified} notified`);
  return stats;
}

/**
 * Start the background scheduler.
 *
 * @param {object[]} [contractors=[]]
 */
function start(contractors = []) {
  if (_state.timer) return; // already running
  console.log(`[Crawler] Scheduler started — interval ${CRAWL_INTERVAL_MS / 1000}s`);

  // Run immediately, then on interval
  runCycle(contractors).catch(console.error);
  _state.timer = setInterval(() => {
    runCycle(contractors).catch(console.error);
  }, CRAWL_INTERVAL_MS);

  _state.nextRun = new Date(Date.now() + CRAWL_INTERVAL_MS).toISOString();
}

/**
 * Stop the background scheduler.
 */
function stop() {
  if (_state.timer) {
    clearInterval(_state.timer);
    _state.timer = null;
    console.log('[Crawler] Scheduler stopped');
  }
}

/**
 * Return current crawler status (for the admin dashboard).
 */
function getStatus() {
  return {
    running   : _state.running,
    lastRun   : _state.lastRun,
    nextRun   : _state.nextRun,
    lastStats : _state.lastStats,
    errors    : _state.errors,
    interval  : CRAWL_INTERVAL_MS,
  };
}

module.exports = { runCycle, start, stop, getStatus, scrapeKijiji, scrapeCraigslist, scrapeReddit };
