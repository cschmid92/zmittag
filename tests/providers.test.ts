import { describe, expect, it } from 'vitest';
import { DemoProvider } from '../src/domain/providers/DemoProvider';

describe('DemoProvider', () => {
  const provider = new DemoProvider();
  const mockLoc = { lat: 47.3779, lng: 8.5403 };

  it('declares all supported capabilities', () => {
    expect(provider.id).toBe('demo');
    expect(provider.capabilities.hasRating).toBe(true);
    expect(provider.capabilities.hasReviewCount).toBe(true);
    expect(provider.capabilities.hasPriceLevel).toBe(true);
    expect(provider.capabilities.hasOpenNow).toBe(true);
  });

  it('fetches places relative to user location within radius', async () => {
    const { places, cachedAt } = await provider.fetchPlaces(mockLoc, 5000);
    expect(places.length).toBeGreaterThan(0);
    expect(cachedAt).toBeGreaterThan(0);

    const firstPlace = places[0];
    expect(firstPlace.name).toBeDefined();
    expect(firstPlace.rating).toBeDefined();
    expect(firstPlace.mapUrl).toContain('google.com/maps');
  });
});
