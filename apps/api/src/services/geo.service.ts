// @ts-nocheck
/**
 * Geo Service — ZIP-code-based distance filtering
 * 
 * Uses the `us-zips` package (US Census Bureau ZIP Code Tabulation Areas)
 * for lat/lng lookups, and the Haversine formula for distance calculations.
 * 
 * Coverage: 33,791 US ZIP codes
 * Source: US Census Bureau (via us-zips npm package)
 */

import usZips from 'us-zips';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ZipLookupResult extends Coordinates {
  zipCode: string;
  found: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EARTH_RADIUS_MILES = 3958.8; // Earth's radius in miles

// ─── ZIP Code Lookup ─────────────────────────────────────────────────────────

/**
 * Look up coordinates for a US ZIP code.
 * Returns null if the ZIP code is not found.
 */
export function getCoordinates(zipCode: string): Coordinates | null {
  // Normalize: pad to 5 digits
  const normalized = zipCode.trim().padStart(5, '0');
  const entry = (usZips as Record<string, Coordinates>)[normalized];
  if (!entry) return null;
  return { latitude: entry.latitude, longitude: entry.longitude };
}

/**
 * Look up coordinates with metadata.
 */
export function lookupZip(zipCode: string): ZipLookupResult {
  const coords = getCoordinates(zipCode);
  if (!coords) {
    return { zipCode, latitude: 0, longitude: 0, found: false };
  }
  return { zipCode, ...coords, found: true };
}

// ─── Haversine Distance ──────────────────────────────────────────────────────

/**
 * Calculate the distance between two points using the Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}

/**
 * Calculate distance between two ZIP codes (in miles).
 * Returns null if either ZIP code is not found.
 */
export function distanceBetweenZips(zip1: string, zip2: string): number | null {
  const coords1 = getCoordinates(zip1);
  const coords2 = getCoordinates(zip2);
  if (!coords1 || !coords2) return null;
  return haversineDistance(
    coords1.latitude, coords1.longitude,
    coords2.latitude, coords2.longitude,
  );
}

// ─── Filtering Helpers ───────────────────────────────────────────────────────

/**
 * Filter an array of items with zip codes by distance from a reference point.
 * 
 * @param items - Array of items to filter
 * @param referenceZip - The center ZIP code to measure from
 * @param radiusMiles - Maximum distance in miles
 * @param getZip - Function to extract ZIP code from each item
 * @returns Items within the radius, sorted by distance (nearest first), with distance attached
 */
export function filterByRadius<T>(
  items: T[],
  referenceZip: string,
  radiusMiles: number,
  getZip: (item: T) => string,
): (T & { _distanceMiles: number })[] {
  const center = getCoordinates(referenceZip);
  if (!center) return []; // Can't filter if center ZIP unknown

  const results: (T & { _distanceMiles: number })[] = [];

  for (const item of items) {
    const itemCoords = getCoordinates(getZip(item));
    if (!itemCoords) continue; // Skip items with unknown ZIP

    const distance = haversineDistance(
      center.latitude, center.longitude,
      itemCoords.latitude, itemCoords.longitude,
    );

    if (distance <= radiusMiles) {
      results.push({ ...item, _distanceMiles: Math.round(distance * 10) / 10 });
    }
  }

  // Sort by distance (nearest first)
  results.sort((a, b) => a._distanceMiles - b._distanceMiles);
  return results;
}

/**
 * Get all ZIP codes within a radius of a center ZIP.
 * Useful for pre-filtering database queries.
 * 
 * Note: This creates a bounding box first (fast), then checks Haversine (accurate).
 */
export function getZipsInRadius(centerZip: string, radiusMiles: number): string[] {
  const center = getCoordinates(centerZip);
  if (!center) return [];

  // Bounding box estimation (1 degree latitude ≈ 69 miles)
  const latDelta = radiusMiles / 69;
  const lngDelta = radiusMiles / (69 * Math.cos((center.latitude * Math.PI) / 180));

  const minLat = center.latitude - latDelta;
  const maxLat = center.latitude + latDelta;
  const minLng = center.longitude - lngDelta;
  const maxLng = center.longitude + lngDelta;

  const zips: string[] = [];
  const allZips = usZips as Record<string, Coordinates>;

  for (const [zip, coords] of Object.entries(allZips)) {
    // Quick bounding box check (very fast)
    if (
      coords.latitude >= minLat && coords.latitude <= maxLat &&
      coords.longitude >= minLng && coords.longitude <= maxLng
    ) {
      // Accurate Haversine check
      const dist = haversineDistance(
        center.latitude, center.longitude,
        coords.latitude, coords.longitude,
      );
      if (dist <= radiusMiles) {
        zips.push(zip);
      }
    }
  }

  return zips;
}

/**
 * Get stats about the ZIP database.
 */
export function getStats() {
  const allZips = usZips as Record<string, Coordinates>;
  return {
    totalZipCodes: Object.keys(allZips).length,
    source: 'US Census Bureau (ZIP Code Tabulation Areas)',
    package: 'us-zips',
  };
}
