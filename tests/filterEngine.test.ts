import { describe, expect, it } from 'vitest';
import { filterCandidates, validateSearchParams } from '../src/domain/filterEngine';
import { DEFAULT_SEARCH_PARAMS, Restaurant } from '../src/domain/types';
import { ProviderCapabilities } from '../src/domain/providers/types';

describe('filterEngine', () => {
  const mockLocation = { lat: 47.3779, lng: 8.5403 };

  const fullCapabilities: ProviderCapabilities = {
    hasRating: true,
    hasReviewCount: true,
    hasPriceLevel: true,
    hasOpenNow: true,
    hasCuisines: true,
  };

  const samplePlaces: Restaurant[] = [
    {
      id: '1',
      name: 'Pizzeria Trevi',
      lat: 47.3780,
      lng: 8.5404,
      rating: 4.5,
      reviewCount: 100,
      priceLevel: 2,
      openNow: true,
      cuisine: 'Italian',
      address: 'Street 1',
    },
    {
      id: '2',
      name: 'Cheap Eats',
      lat: 47.3781,
      lng: 8.5405,
      rating: 3.5, // Low rating
      reviewCount: 200,
      priceLevel: 1,
      openNow: true,
      cuisine: 'Fast Food',
      address: 'Street 2',
    },
    {
      id: '3',
      name: 'Unrated Diner',
      lat: 47.3782,
      lng: 8.5406,
      rating: undefined, // No rating
      reviewCount: undefined,
      priceLevel: 2,
      openNow: true,
      cuisine: 'American',
      address: 'Street 3',
    },
    {
      id: '4',
      name: 'Night Spot',
      lat: 47.3783,
      lng: 8.5407,
      rating: 4.8,
      reviewCount: 50,
      priceLevel: 3,
      openNow: false, // Closed
      cuisine: 'French',
      address: 'Street 4',
    },
  ];

  it('validates search parameters correctly', () => {
    const invalidParams = {
      radius: 100,
      minRating: 6.0,
      minReviews: -5,
      priceLevels: [],
      openNow: true,
      cuisines: [],
      favourHigherRated: false,
    };

    const { corrected, corrections } = validateSearchParams(invalidParams);
    expect(corrected.radius).toBe(250);
    expect(corrected.minRating).toBe(5.0);
    expect(corrected.minReviews).toBe(0);
    expect(corrected.priceLevels).toEqual([1, 2, 3, 4]);
    expect(corrections.length).toBe(4);
  });

  it('filters candidate places by active criteria', () => {
    const params = {
      ...DEFAULT_SEARCH_PARAMS,
      minRating: 4.0,
      minReviews: 25,
      openNow: true,
    };

    const result = filterCandidates(samplePlaces, mockLocation, params, fullCapabilities);
    expect(result.candidateSet.length).toBe(1);
    expect(result.candidateSet[0].name).toBe('Pizzeria Trevi');
    expect(result.excludedAudits.length).toBe(3);
  });

  it('excludes places with no rating when minRating > 0', () => {
    const params = { ...DEFAULT_SEARCH_PARAMS, minRating: 4.0 };
    const result = filterCandidates(samplePlaces, mockLocation, params, fullCapabilities);
    const unratedAudit = result.excludedAudits.find((a) => a.restaurantId === '3');
    expect(unratedAudit?.reasons).toContain('noRatingInfo');
  });

  it('tracks reason counts accurately for empty state explanation', () => {
    const params = { ...DEFAULT_SEARCH_PARAMS, minRating: 4.9, minReviews: 500 };
    const result = filterCandidates(samplePlaces, mockLocation, params, fullCapabilities);
    expect(result.candidateSet.length).toBe(0);
    expect(result.reasonCounts.rating).toBeGreaterThan(0);
  });
});
