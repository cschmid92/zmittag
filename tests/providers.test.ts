import { describe, expect, it } from 'vitest';
import { GooglePlacesProvider } from '../src/domain/providers/GooglePlacesProvider';

describe('GooglePlacesProvider', () => {
  const provider = new GooglePlacesProvider('test_key');

  it('declares expected capabilities', () => {
    expect(provider.id).toBe('google_places');
    expect(provider.name).toBe('Google Maps Places API');
    expect(provider.capabilities.hasRating).toBe(true);
    expect(provider.capabilities.hasReviewCount).toBe(true);
    expect(provider.capabilities.hasPriceLevel).toBe(true);
    expect(provider.capabilities.hasOpenNow).toBe(true);
    expect(provider.capabilities.hasCuisines).toBe(true);
  });

  it('throws error when API key is missing', async () => {
    const emptyProvider = new GooglePlacesProvider('');
    const mockLoc = { lat: 47.3779, lng: 8.5403 };
    await expect(emptyProvider.fetchPlaces(mockLoc, 1500)).rejects.toThrow(
      'Google Maps API Key is missing'
    );
  });
});
