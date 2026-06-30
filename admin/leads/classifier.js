/**
 * Lead Classification Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Categorises a raw lead text into one of the known trade categories used
 * on LinxServices.ca using multi-keyword scoring.  Each category has a
 * weighted keyword list; the category with the highest cumulative score wins.
 * A minimum score of 1 is required — otherwise the lead is filed as 'general'.
 */

'use strict';

// ─── Category keyword maps ────────────────────────────────────────────────────
// Format: [keyword, weight]  (weight 2 = strong signal, 1 = mild signal)

const CATEGORIES = {
  plumbing: [
    ['plumb', 2], ['pipe', 2], ['drain', 2], ['leak', 2], ['faucet', 2],
    ['toilet', 2], ['water heater', 2], ['sewer', 2], ['clog', 2],
    ['waterline', 2], ['tap', 1], ['sink', 1], ['shower', 1], ['bathtub', 1],
    ['backflow', 2], ['sump pump', 2], ['water pressure', 1],
  ],
  electrical: [
    ['electric', 2], ['electrical', 2], ['wiring', 2], ['panel', 2],
    ['outlet', 2], ['breaker', 2], ['circuit', 2], ['voltage', 2],
    ['light fixture', 2], ['ceiling fan', 1], ['generator', 1],
    ['rewire', 2], ['fuse', 1], ['socket', 1], ['grounding', 2],
    ['ev charger', 2], ['smart switch', 1],
  ],
  roofing: [
    ['roof', 2], ['shingle', 2], ['gutter', 2], ['eave', 2], ['soffit', 2],
    ['fascia', 2], ['flashing', 2], ['skylight', 2], ['flat roof', 2],
    ['leak roof', 2], ['attic', 1], ['chimney', 1], ['downspout', 1],
    ['metal roof', 2], ['tile roof', 2],
  ],
  hvac: [
    ['hvac', 2], ['furnace', 2], ['air condition', 2], ['ac unit', 2],
    ['heat pump', 2], ['ductwork', 2], ['ventilation', 2], ['boiler', 2],
    ['thermostat', 2], ['vent', 1], ['heating', 1], ['cooling', 1],
    ['air filter', 1], ['mini split', 2], ['radiant heat', 2],
  ],
  landscaping: [
    ['landscap', 2], ['lawn', 2], ['garden', 2], ['mow', 2], ['grass', 2],
    ['sod', 2], ['irrigation', 2], ['sprinkler', 2], ['mulch', 2],
    ['trim', 1], ['hedge', 1], ['tree', 1], ['shrub', 1], ['weed', 1],
    ['snow removal', 2], ['driveway snow', 2], ['leaf', 1],
  ],
  renovation: [
    ['renovate', 2], ['renovation', 2], ['remodel', 2], ['basement', 2],
    ['kitchen reno', 2], ['bathroom reno', 2], ['addition', 2],
    ['drywall', 2], ['flooring', 2], ['tile', 1], ['painting', 1],
    ['deck', 2], ['fence', 2], ['siding', 2], ['stucco', 1],
    ['framing', 2], ['insulation', 2],
  ],
  cleaning: [
    ['clean', 2], ['pressure wash', 2], ['power wash', 2], ['window clean', 2],
    ['carpet clean', 2], ['duct clean', 2], ['deep clean', 2],
    ['janitorial', 2], ['house clean', 1], ['maid', 1],
  ],
  painting: [
    ['paint', 2], ['stain', 2], ['varnish', 2], ['primer', 2],
    ['interior paint', 2], ['exterior paint', 2], ['spray paint', 2],
    ['wallpaper', 2], ['refinish', 1],
  ],
  moving: [
    ['moving', 2], ['mover', 2], ['relocation', 2], ['storage', 1],
    ['pack', 1], ['unpack', 1], ['furniture move', 2], ['haul', 1],
  ],
  pest_control: [
    ['pest', 2], ['exterminator', 2], ['bug', 2], ['rodent', 2],
    ['mice', 2], ['rat', 2], ['ant', 1], ['cockroach', 2], ['bedbug', 2],
    ['wasp', 1], ['termite', 2], ['wildlife removal', 2],
  ],
  appliance_repair: [
    ['appliance', 2], ['washer', 2], ['dryer', 2], ['dishwasher', 2],
    ['refrigerator', 2], ['fridge', 2], ['stove', 2], ['oven', 2],
    ['microwave', 1], ['freezer', 2], ['repair appliance', 2],
  ],
  locksmith: [
    ['locksmith', 2], ['lock', 2], ['key', 1], ['deadbolt', 2],
    ['lockout', 2], ['rekey', 2], ['door lock', 2], ['safe', 1],
  ],
  general: [],
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Classify a lead text into a trade category.
 *
 * @param {string} text  – Concatenated title + description of the lead
 * @returns {{ category: string, score: number, allScores: Record<string,number> }}
 */
function classifyLead(text) {
  if (!text || typeof text !== 'string') {
    return { category: 'general', score: 0, allScores: {} };
  }

  const lower = text.toLowerCase();
  const allScores = {};

  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (cat === 'general') continue;
    let score = 0;
    for (const [kw, weight] of keywords) {
      if (lower.includes(kw)) score += weight;
    }
    allScores[cat] = score;
  }

  const best = Object.entries(allScores).sort((a, b) => b[1] - a[1])[0];
  const category = best && best[1] >= 1 ? best[0] : 'general';
  const score    = best ? best[1] : 0;

  return { category, score, allScores };
}

/**
 * Returns a sorted array of all trade category names (excluding 'general').
 */
function getCategories() {
  return Object.keys(CATEGORIES).filter((c) => c !== 'general').sort();
}

module.exports = { classifyLead, getCategories, CATEGORIES };
