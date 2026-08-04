import { describe, expect, it } from 'vitest';
import {
  calculateDistanceMeters,
  estimateWalkingTimeMinutes,
  formatDistance,
  getLocationCellKey,
} from '../src/domain/geoUtils';

describe('geoUtils', () => {
  it('calculates accurate distance between coordinates', () => {
    const zurichMainStation = { lat: 47.3779, lng: 8.5403 };
    const zurichParadeplatz = { lat: 47.3696, lng: 8.5389 };

    const distance = calculateDistanceMeters(zurichMainStation, zurichParadeplatz);
    // Distance should be around 930 meters
    expect(distance).toBeGreaterThan(800);
    expect(distance).toBeLessThan(1100);
  });

  it('estimates walking time based on 80m/min speed', () => {
    expect(estimateWalkingTimeMinutes(400)).toBe(5);
    expect(estimateWalkingTimeMinutes(800)).toBe(10);
    expect(estimateWalkingTimeMinutes(50)).toBe(1);
  });

  it('formats distance nicely in m or km', () => {
    expect(formatDistance(450)).toBe('450 m');
    expect(formatDistance(1500)).toBe('1.5 km');
  });

  it('generates reproducible location cell keys', () => {
    const loc = { lat: 47.377912, lng: 8.540321 };
    const key1 = getLocationCellKey(loc, 1500);
    const key2 = getLocationCellKey({ lat: 47.378000, lng: 8.540300 }, 1500);

    expect(key1).toBe('47.378,8.540_r1500');
    expect(key1).toEqual(key2);
  });
});
