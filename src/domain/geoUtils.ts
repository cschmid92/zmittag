import { LocationCoordinates } from './types';

/**
 * Calculates Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateDistanceMeters(
  loc1: LocationCoordinates,
  loc2: { lat: number; lng: number }
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) *
      Math.cos(toRad(loc2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Estimates walking time in minutes based on distance in meters.
 * Average walking speed: 4.8 km/h ~ 80 meters per minute.
 */
export function estimateWalkingTimeMinutes(distanceMeters: number): number {
  return Math.max(1, Math.round(distanceMeters / 80));
}

/**
 * Formats distance for display (e.g. "450 m" or "1.2 km").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Generates a location cell key (grid precision approx 100m) for caching.
 */
export function getLocationCellKey(loc: LocationCoordinates, radius: number): string {
  const precision = 0.001; // ~100 meters lat/lng precision
  const cellLat = Math.round(loc.lat / precision) * precision;
  const cellLng = Math.round(loc.lng / precision) * precision;
  return `${cellLat.toFixed(3)},${cellLng.toFixed(3)}_r${radius}`;
}
