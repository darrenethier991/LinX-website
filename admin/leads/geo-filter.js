/**
 * Geographic Filtering Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches leads to contractor service areas using:
 *  1. Postal-code radius matching (Canadian FSA prefix + Haversine distance)
 *  2. City-name direct match
 *
 * Canadian postal codes use a 6-character format: A1A 1A1
 * The first three characters (FSA — Forward Sortation Area) identify a region.
 *
 * For a production system, pair this with the Canada Post postal-code database
 * or a geocoding API (Google Maps, Nominatim) to get lat/lng per FSA.
 * This module ships with approximate lat/lng centroids for the most common
 * Ontario/BC/Alberta FSAs used by LinxServices.ca contractors, plus a fallback
 * to city-name comparison.
 */

'use strict';

// ─── FSA lat/lng centroids (sample set — expand as needed) ───────────────────
// Source: approximate geographic centres of each FSA district.
const FSA_COORDS = {
  // Ontario — GTA
  M1: [43.773, -79.256], M2: [43.757, -79.374], M3: [43.737, -79.447],
  M4: [43.697, -79.370], M5: [43.651, -79.383], M6: [43.659, -79.450],
  M7: [43.641, -79.381], M8: [43.629, -79.507], M9: [43.663, -79.527],
  L3: [43.869, -79.028], L4: [43.848, -79.488], L5: [43.589, -79.644],
  L6: [43.693, -79.754], L7: [44.052, -79.461], L8: [43.259, -79.875],
  // Mississauga / Brampton
  L9: [43.733, -79.627],
  // Ottawa
  K1: [45.421, -75.697], K2: [45.384, -75.763], K4: [45.320, -75.608],
  // Hamilton
  L9: [43.255, -79.869],
  // British Columbia — Metro Vancouver
  V5: [49.213, -123.049], V6: [49.254, -123.127], V7: [49.293, -123.019],
  V8: [48.432, -123.369], V9: [49.121, -122.870],
  // Alberta — Calgary / Edmonton
  T1: [50.904, -114.117], T2: [51.066, -114.093], T3: [51.054, -114.195],
  T6: [53.570, -113.570], T5: [53.546, -113.503],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert degrees to radians.
 */
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Haversine distance between two [lat, lng] pairs, in kilometres.
 */
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R    = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Extract the 2-character FSA from a Canadian postal code string.
 * Accepts "M5V 3A8", "m5v3a8", "M5V", etc.
 */
function extractFSA(postalCode) {
  if (!postalCode) return null;
  const clean = postalCode.replace(/\s+/g, '').toUpperCase();
  // Canadian postal code: letter–digit–letter  digit–letter–digit
  if (/^[A-Z]\d[A-Z]/.test(clean)) {
    return clean.slice(0, 2); // letter + digit prefix
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Determine whether a lead's location falls within a contractor's service area.
 *
 * @param {object} lead
 * @param {string} [lead.postalCode]  Canadian postal code of the job site
 * @param {string} [lead.city]        City name of the job site
 * @param {object} contractor
 * @param {string} [contractor.postalCode]   Contractor's base postal code
 * @param {number} [contractor.serviceRadiusKm=50]  Radius in km
 * @param {string[]} [contractor.serviceCities]     Explicit city list
 * @returns {{ matches: boolean, distanceKm: number|null, reason: string }}
 */
function matchesServiceArea(lead, contractor) {
  const radiusKm     = contractor.serviceRadiusKm ?? 50;
  const serviceCities = (contractor.serviceCities || []).map((c) => c.toLowerCase().trim());

  // 1. City-name direct match (fast path)
  if (lead.city && serviceCities.length > 0) {
    const leadCity = lead.city.toLowerCase().trim();
    if (serviceCities.some((c) => leadCity.includes(c) || c.includes(leadCity))) {
      return { matches: true, distanceKm: null, reason: 'city_match' };
    }
  }

  // 2. Postal-code radius match
  const leadFSA       = extractFSA(lead.postalCode);
  const contractorFSA = extractFSA(contractor.postalCode);

  if (leadFSA && contractorFSA) {
    const leadCoords       = FSA_COORDS[leadFSA];
    const contractorCoords = FSA_COORDS[contractorFSA];

    if (leadCoords && contractorCoords) {
      const distanceKm = haversineKm(leadCoords, contractorCoords);
      if (distanceKm <= radiusKm) {
        return { matches: true, distanceKm, reason: 'postal_radius' };
      }
      return { matches: false, distanceKm, reason: 'outside_radius' };
    }

    // Same FSA prefix → almost certainly same region
    if (leadFSA === contractorFSA) {
      return { matches: true, distanceKm: 0, reason: 'same_fsa' };
    }
  }

  // 3. Fallback: if neither city nor postal code can be resolved, include the lead
  //    (let the contractor decide) — avoids false exclusions for rural addresses.
  if (!lead.postalCode && !lead.city) {
    return { matches: true, distanceKm: null, reason: 'no_location_data' };
  }

  return { matches: false, distanceKm: null, reason: 'no_match' };
}

/**
 * Filter an array of leads down to those that match a contractor's service area.
 *
 * @param {object[]} leads
 * @param {object}   contractor
 * @returns {object[]} Matching leads
 */
function filterLeadsForContractor(leads, contractor) {
  return leads.filter((lead) => matchesServiceArea(lead, contractor).matches);
}

module.exports = { matchesServiceArea, filterLeadsForContractor, haversineKm, extractFSA };
