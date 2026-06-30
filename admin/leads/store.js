/**
 * Lead Store — In-Memory + JSON Persistence
 * ─────────────────────────────────────────────────────────────────────────────
 * Acts as the single source of truth for all scraped and organic leads.
 * Persists to a JSON file on disk so leads survive server restarts.
 *
 * In production, replace the JSON file backend with MongoDB or PostgreSQL by
 * swapping out _save() / _load() while keeping the public interface identical.
 *
 * Lead schema:
 * {
 *   id          : string  (UUID v4)
 *   contentHash : string  (SHA-256, used for deduplication)
 *   title       : string
 *   description : string
 *   sourceUrl   : string
 *   sourcePlatform : string  ('kijiji'|'craigslist'|'reddit'|'facebook'|'nextdoor'|'organic'|…)
 *   postedAt    : ISO-8601 string
 *   scrapedAt   : ISO-8601 string
 *   category    : string  (trade category from classifier)
 *   categoryScore : number
 *   city        : string
 *   province    : string
 *   postalCode  : string
 *   contactMethod : string
 *   status      : 'active'|'archived'|'expired'|'claimed'
 *   matchedContractors : string[]  (contractor IDs notified)
 *   claimedBy   : string|null
 *   raw         : string  (raw scraped text, truncated to 2000 chars)
 * }
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { buildHash }  = require('./deduplicator');

const STORE_PATH   = path.join(__dirname, 'data', 'leads.json');
const FRESHNESS_MS = 72 * 60 * 60 * 1000; // 72 hours default

// ─── Internal state ───────────────────────────────────────────────────────────

let _leads = [];

// ─── Persistence ─────────────────────────────────────────────────────────────

function _ensureDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function _save() {
  _ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(_leads, null, 2), 'utf8');
}

function _load() {
  _ensureDir();
  if (!fs.existsSync(STORE_PATH)) {
    _leads = [];
    return;
  }
  try {
    _leads = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    _leads = [];
  }
}

// Load on first import
_load();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Add a new lead.  Returns the saved lead or null if it was a duplicate.
 *
 * @param {object} leadData   Partial lead (will be merged with defaults)
 * @param {boolean} [skipDedupe=false]
 * @returns {{ lead: object|null, duplicate: boolean }}
 */
function addLead(leadData, skipDedupe = false) {
  const { isDuplicate } = require('./deduplicator');

  const contentHash = buildHash(leadData);

  if (!skipDedupe) {
    const check = isDuplicate({ ...leadData, contentHash }, _leads);
    if (check.isDuplicate) {
      return { lead: null, duplicate: true, reason: check.reason };
    }
  }

  const now  = new Date().toISOString();
  const lead = {
    id                 : uuidv4(),
    contentHash,
    title              : (leadData.title || '').slice(0, 300),
    description        : (leadData.description || '').slice(0, 2000),
    sourceUrl          : leadData.sourceUrl || '',
    sourcePlatform     : leadData.sourcePlatform || 'unknown',
    postedAt           : leadData.postedAt || now,
    scrapedAt          : now,
    category           : leadData.category || 'general',
    categoryScore      : leadData.categoryScore || 0,
    city               : leadData.city || '',
    province           : leadData.province || '',
    postalCode         : leadData.postalCode || '',
    contactMethod      : leadData.contactMethod || '',
    status             : 'active',
    matchedContractors : [],
    claimedBy          : null,
    raw                : (leadData.raw || '').slice(0, 2000),
  };

  _leads.push(lead);
  _save();
  return { lead, duplicate: false };
}

/**
 * Retrieve all leads, with optional filters.
 *
 * @param {object} [filters]
 * @param {string}   [filters.category]
 * @param {string}   [filters.status]       default: 'active'
 * @param {string}   [filters.sourcePlatform]
 * @param {string}   [filters.city]
 * @param {number}   [filters.freshnessMs]  Only leads newer than this window
 * @param {number}   [filters.limit]
 * @param {number}   [filters.offset]
 * @returns {object[]}
 */
function getLeads(filters = {}) {
  const {
    category,
    status = 'active',
    sourcePlatform,
    city,
    freshnessMs = FRESHNESS_MS,
    limit  = 200,
    offset = 0,
  } = filters;

  const cutoff = Date.now() - freshnessMs;

  let results = _leads.filter((l) => {
    if (status && l.status !== status) return false;
    if (category && l.category !== category) return false;
    if (sourcePlatform && l.sourcePlatform !== sourcePlatform) return false;
    if (city && !l.city.toLowerCase().includes(city.toLowerCase())) return false;
    if (new Date(l.postedAt).getTime() < cutoff) return false;
    return true;
  });

  // Most-recent first
  results.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

  return results.slice(offset, offset + limit);
}

/**
 * Get a single lead by ID.
 */
function getLeadById(id) {
  return _leads.find((l) => l.id === id) || null;
}

/**
 * Update a lead's fields (status, claimedBy, matchedContractors, etc.)
 */
function updateLead(id, updates) {
  const idx = _leads.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  _leads[idx] = { ..._leads[idx], ...updates, id };
  _save();
  return _leads[idx];
}

/**
 * Archive leads older than freshnessMs.  Called by the crawler scheduler.
 *
 * @param {number} [freshnessMs=72h]
 * @returns {number} Number of leads archived
 */
function archiveExpiredLeads(freshnessMs = FRESHNESS_MS) {
  const cutoff = Date.now() - freshnessMs;
  let count = 0;
  _leads.forEach((lead, i) => {
    if (lead.status === 'active' && new Date(lead.postedAt).getTime() < cutoff) {
      _leads[i] = { ...lead, status: 'expired' };
      count++;
    }
  });
  if (count > 0) _save();
  return count;
}

/**
 * Aggregate statistics for the admin dashboard.
 */
function getStats() {
  const now     = Date.now();
  const fresh   = now - FRESHNESS_MS;
  const active  = _leads.filter((l) => l.status === 'active');
  const expired = _leads.filter((l) => l.status === 'expired');

  const byCategory = {};
  const bySource   = {};

  for (const l of _leads) {
    byCategory[l.category]      = (byCategory[l.category]      || 0) + 1;
    bySource[l.sourcePlatform]  = (bySource[l.sourcePlatform]  || 0) + 1;
  }

  return {
    total         : _leads.length,
    active        : active.length,
    expired       : expired.length,
    newLast72h    : active.filter((l) => new Date(l.postedAt).getTime() >= fresh).length,
    byCategory,
    bySource,
  };
}

/**
 * Reload the store from disk (useful after external writes in tests).
 */
function reload() {
  _load();
}

module.exports = { addLead, getLeads, getLeadById, updateLead, archiveExpiredLeads, getStats, reload };
