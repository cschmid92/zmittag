import { describe, expect, it } from 'vitest';
import { executeSpin, selectCandidate } from '../src/domain/spinEngine';
import { DEFAULT_SEARCH_PARAMS, Restaurant } from '../src/domain/types';
import { ProviderCapabilities } from '../src/domain/providers/types';

describe('spinEngine', () => {
  const mockLoc = { lat: 47.3779, lng: 8.5403 };

  const capabilities: ProviderCapabilities = {
    hasRating: true,
    hasReviewCount: true,
    hasPriceLevel: true,
    hasOpenNow: true,
    hasCuisines: true,
  };

  const samplePlaces: Restaurant[] = [
    {
      id: 'p1',
      name: 'High Rated Place',
      lat: 47.3780,
      lng: 8.5404,
      rating: 4.9,
      reviewCount: 300,
      priceLevel: 2,
      openNow: true,
      cuisine: 'Italian',
      address: 'Addr 1',
    },
    {
      id: 'p2',
      name: 'Decent Place',
      lat: 47.3781,
      lng: 8.5405,
      rating: 4.1,
      reviewCount: 50,
      priceLevel: 2,
      openNow: true,
      cuisine: 'Italian',
      address: 'Addr 2',
    },
    {
      id: 'p3',
      name: 'Far Away Place',
      lat: 47.4500, // > 5km away
      lng: 8.6000,
      rating: 4.5,
      reviewCount: 100,
      priceLevel: 2,
      openNow: true,
      cuisine: 'Italian',
      address: 'Addr 3',
    },
  ];

  it('selects candidates deterministically with injected PRNG', () => {
    // PRNG returning 0.1 -> picks first candidate in uniform selection
    const candidate1 = selectCandidate(samplePlaces, false, () => 0.1);
    expect(candidate1.id).toBe('p1');

    // PRNG returning 0.99 -> picks last candidate
    const candidate2 = selectCandidate(samplePlaces, false, () => 0.99);
    expect(candidate2.id).toBe('p3');
  });

  it('excludes last 10 suggestions and rejected places during spin', () => {
    const session = {
      lastSuggestions: ['p1'],
      rejectedIds: new Set<string>(['p2']),
    };

    const spin = executeSpin(
      samplePlaces,
      mockLoc,
      { ...DEFAULT_SEARCH_PARAMS, radius: 10000 },
      capabilities,
      'google_places',
      'Google Maps Places API',
      session,
      Date.now(),
      () => 0.5
    );

    expect(spin.selected?.id).toBe('p3');
  });

  it('automatically relaxes constraints step-by-step when candidate set is empty', () => {
    // Initial strict search radius = 500m where p3 is far away, and minRating=4.8 excludes p2
    // p1 is in rejected list
    const session = {
      lastSuggestions: ['p1'],
      rejectedIds: new Set<string>(),
    };

    const spin = executeSpin(
      samplePlaces,
      mockLoc,
      { ...DEFAULT_SEARCH_PARAMS, radius: 500, minRating: 4.8 },
      capabilities,
      'google_places',
      'Google Maps Places API',
      session,
      Date.now(),
      () => 0.5
    );

    expect(spin.selected).not.toBeNull();
    expect(spin.appliedRelaxations.length).toBeGreaterThan(0);
    // Dropped exclusions relaxation should have occurred
    expect(spin.appliedRelaxations[0].type).toBe('droppedExclusionList');
  });

  it('never relaxes "openNow" or cuisine filters', () => {
    const closedPlaces: Restaurant[] = [
      {
        id: 'closed1',
        name: 'Closed diner',
        lat: 47.3780,
        lng: 8.5404,
        rating: 4.5,
        reviewCount: 100,
        priceLevel: 2,
        openNow: false,
        cuisine: 'Mexican',
        address: 'Closed address',
      },
    ];

    const spin = executeSpin(
      closedPlaces,
      mockLoc,
      { ...DEFAULT_SEARCH_PARAMS, openNow: true, cuisines: ['Italian'] },
      capabilities,
      'google_places',
      'Google Maps Places API',
      { lastSuggestions: [], rejectedIds: new Set() },
      Date.now(),
      () => 0.5
    );

    expect(spin.selected).toBeNull();
    expect(spin.emptyStateExplanation).toBeDefined();
  });
});
