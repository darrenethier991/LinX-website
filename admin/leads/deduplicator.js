/**
 * Lead Deduplication Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Prevents the same real-world lead from appearing twice in the leads store,
 * even when scraped from different platforms or with minor text variations.
 *
 * Strategy:
 *  1. Exact-hash check  — SHA-256 of (sourceUrl + normalised title)
 *  2. Fuzzy similarity  — Jaccard similarity on normalised word tokens
 *     across all leads from the same city in the last 72 h.
 *
 * Both checks are performed in-process against the in-memory leads store.
 * For production at scale, replace the in-memory Set/Array with a Redis
 * sorted-set TTL cache.
 */

'use strict';

const crypto = require('crypto');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise a string for comparison: lowercase, strip punctuation, collapse
 * whitespace, and remove common filler words.
 */
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'i','we','my','our','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'looking','need','wanted','anyone','can','help','please','hi','hello',
  'anyone','someone','someone','know','trying','get','got','want','use',
]);

function normalise(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .join(' ');
}

/**
 * SHA-256 hex digest of a string.
 */
function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Jaccard similarity between two normalised strings (set-based, word tokens).
 * Returns 0–1.
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(/\s+/).filter(Boolean));
  const setB = new Set(b.split(/\s+/).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a content-hash for a lead (used for exact-duplicate detection).
 *
 * @param {{ sourceUrl: string, title: string }} lead
 * @returns {string} hex hash
 */
function buildHash(lead) {
  const key = `${(lead.sourceUrl || '').trim()}|${normalise(lead.title || '')}`;
  return sha256(key);
}

/**
 * Determine whether a candidate lead is a duplicate of any lead in the pool.
 *
 * @param {object}   candidate   - The new lead object (must have title, city, postedAt)
 * @param {object[]} pool        - Existing leads to compare against
 * @param {object}   [opts]
 * @param {number}   [opts.similarityThreshold=0.72]  Jaccard threshold for fuzzy match
 * @param {number}   [opts.windowMs=72*60*60*1000]    Time window for fuzzy comparison
 * @returns {{ isDuplicate: boolean, matchedHash?: string, reason?: string }}
 */
function isDuplicate(candidate, pool, opts = {}) {
  const { similarityThreshold = 0.72, windowMs = 72 * 60 * 60 * 1000 } = opts;

  const candidateHash    = buildHash(candidate);
  const candidateNorm    = normalise(`${candidate.title || ''} ${candidate.description || ''}`);
  const candidatePosted  = candidate.postedAt ? new Date(candidate.postedAt).getTime() : Date.now();
  const windowStart      = candidatePosted - windowMs;

  for (const existing of pool) {
    // 1. Exact hash match
    if (existing.contentHash === candidateHash) {
      return { isDuplicate: true, matchedHash: existing.contentHash, reason: 'exact_hash' };
    }

    // 2. Fuzzy match — only compare same-city leads within the time window
    const existingPosted = existing.postedAt ? new Date(existing.postedAt).getTime() : 0;
    if (
      existingPosted >= windowStart &&
      (existing.city || '').toLowerCase() === (candidate.city || '').toLowerCase()
    ) {
      const existingNorm = normalise(`${existing.title || ''} ${existing.description || ''}`);
      const sim = jaccardSimilarity(candidateNorm, existingNorm);
      if (sim >= similarityThreshold) {
        return { isDuplicate: true, matchedHash: existing.contentHash, reason: 'fuzzy', similarity: sim };
      }
    }
  }

  return { isDuplicate: false };
}

module.exports = { buildHash, isDuplicate, normalise, jaccardSimilarity };
