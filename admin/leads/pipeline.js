/**
 * Lead Pipeline — Unified Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 * ALL leads — whether scraped from the web or posted organically by homeowners
 * on LinxServices.ca — flow through this single pipeline function.
 *
 * Pipeline steps:
 *  1. Classify trade category
 *  2. Deduplicate against existing leads
 *  3. Save to store
 *  4. Archive expired leads (opportunistic housekeeping)
 *  5. Match to registered contractors (geo + category)
 *  6. Notify matched contractors
 *
 * Usage (from crawler or organic post handler):
 *
 *   const { processLead } = require('./pipeline');
 *   const result = await processLead(rawLeadData, registeredContractors);
 */

'use strict';

const { classifyLead }       = require('./classifier');
const { isDuplicate }        = require('./deduplicator');
const { addLead, archiveExpiredLeads, getLeadById } = require('./store');
const { filterLeadsForContractor } = require('./geo-filter');
const { broadcastLead }      = require('./notifier');

/**
 * Process a single raw lead through the full pipeline.
 *
 * @param {object}   rawLead              Partially-filled lead fields
 * @param {object[]} [contractors=[]]     Registered contractor profiles for matching
 * @param {object}   [opts={}]
 * @param {boolean}  [opts.notify=true]   Set false to skip notifications (useful for bulk backfill)
 * @returns {Promise<{
 *   lead: object|null,
 *   duplicate: boolean,
 *   category: string,
 *   notified: number,
 *   archived: number
 * }>}
 */
async function processLead(rawLead, contractors = [], opts = {}) {
  const { notify = true } = opts;

  // ── Step 1: Classify ──────────────────────────────────────────────────────
  const text = `${rawLead.title || ''} ${rawLead.description || ''}`;
  const { category, score } = classifyLead(text);

  const enriched = {
    ...rawLead,
    category,
    categoryScore: score,
  };

  // ── Step 2 + 3: Deduplicate & Store ───────────────────────────────────────
  const { lead, duplicate, reason } = addLead(enriched);

  if (duplicate) {
    return { lead: null, duplicate: true, reason, category, notified: 0, archived: 0 };
  }

  // ── Step 4: Archive expired leads (housekeeping) ───────────────────────────
  const archived = archiveExpiredLeads();

  // ── Step 5 + 6: Match & Notify ────────────────────────────────────────────
  let notified = 0;
  if (notify && contractors.length > 0 && lead) {
    // Filter to contractors in the same trade category
    const categoryMatches = contractors.filter(
      (c) =>
        !c.categories ||
        c.categories.length === 0 ||
        c.categories.includes(lead.category) ||
        c.categories.includes('general')
    );

    // Further filter by service area
    const geoMatches = filterLeadsForContractor
      ? categoryMatches.filter((c) => {
          const { filterLeadsForContractor: fn } = require('./geo-filter');
          return fn([lead], c).length > 0;
        })
      : categoryMatches;

    if (geoMatches.length > 0) {
      notified = await broadcastLead(lead, geoMatches);
    }
  }

  return { lead, duplicate: false, category, notified, archived };
}

/**
 * Bulk-process an array of raw leads (e.g. a full crawler batch).
 * Runs sequentially to avoid overwhelming notification targets.
 *
 * @param {object[]} rawLeads
 * @param {object[]} contractors
 * @param {object}   [opts]
 * @returns {Promise<{ added: number, duplicates: number, notified: number, archived: number }>}
 */
async function processBatch(rawLeads, contractors = [], opts = {}) {
  let added = 0, duplicates = 0, notified = 0, archived = 0;

  for (const raw of rawLeads) {
    const result = await processLead(raw, contractors, opts);
    if (result.duplicate) {
      duplicates++;
    } else {
      added++;
      notified += result.notified;
      archived  = Math.max(archived, result.archived); // housekeeping runs once per batch effectively
    }
  }

  return { added, duplicates, notified, archived };
}

module.exports = { processLead, processBatch };
