import {
  ExclusionAudit,
  ExclusionReason,
  FilterResult,
  LocationCoordinates,
  ParameterCorrection,
  Restaurant,
  SearchParams,
} from './types';
import { ProviderCapabilities } from './providers/types';
import { calculateDistanceMeters } from './geoUtils';

/**
 * Validates search parameters and returns corrected parameter object plus list of corrections made.
 */
export function validateSearchParams(params: SearchParams): {
  corrected: SearchParams;
  corrections: ParameterCorrection[];
} {
  const corrections: ParameterCorrection[] = [];
  const corrected: SearchParams = { ...params };

  // Radius: 250 to 10000 m
  if (corrected.radius < 250) {
    corrections.push({
      field: 'radius',
      originalValue: params.radius,
      correctedValue: 250,
      messageEn: 'Radius adjusted to minimum of 250m',
      messageDe: 'Radius auf Minimum von 250m angepasst',
    });
    corrected.radius = 250;
  } else if (corrected.radius > 10000) {
    corrections.push({
      field: 'radius',
      originalValue: params.radius,
      correctedValue: 10000,
      messageEn: 'Radius adjusted to maximum of 10,000m',
      messageDe: 'Radius auf Maximum von 10,000m angepasst',
    });
    corrected.radius = 10000;
  }

  // Min rating: 0.0 to 5.0, step 0.1
  if (corrected.minRating < 0.0) {
    corrections.push({
      field: 'minRating',
      originalValue: params.minRating,
      correctedValue: 0.0,
      messageEn: 'Minimum rating adjusted to 0.0',
      messageDe: 'Mindestbewertung auf 0.0 angepasst',
    });
    corrected.minRating = 0.0;
  } else if (corrected.minRating > 5.0) {
    corrections.push({
      field: 'minRating',
      originalValue: params.minRating,
      correctedValue: 5.0,
      messageEn: 'Minimum rating adjusted to 5.0',
      messageDe: 'Mindestbewertung auf 5.0 angepasst',
    });
    corrected.minRating = 5.0;
  } else {
    // Round to 1 decimal place
    corrected.minRating = Math.round(corrected.minRating * 10) / 10;
  }

  // Min reviews: 0 to 1000
  if (corrected.minReviews < 0) {
    corrections.push({
      field: 'minReviews',
      originalValue: params.minReviews,
      correctedValue: 0,
      messageEn: 'Minimum review count adjusted to 0',
      messageDe: 'Mindestanzahl Bewertungen auf 0 angepasst',
    });
    corrected.minReviews = 0;
  } else if (corrected.minReviews > 1000) {
    corrections.push({
      field: 'minReviews',
      originalValue: params.minReviews,
      correctedValue: 1000,
      messageEn: 'Minimum review count adjusted to 1000',
      messageDe: 'Mindestanzahl Bewertungen auf 1000 angepasst',
    });
    corrected.minReviews = 1000;
  } else {
    corrected.minReviews = Math.floor(corrected.minReviews);
  }

  // Price levels: subset of [1, 2, 3, 4]
  if (!corrected.priceLevels || corrected.priceLevels.length === 0) {
    corrections.push({
      field: 'priceLevels',
      originalValue: params.priceLevels,
      correctedValue: [1, 2, 3, 4],
      messageEn: 'Price level reset to all price tiers',
      messageDe: 'Preiskategorie auf alle Stufen zurückgesetzt',
    });
    corrected.priceLevels = [1, 2, 3, 4];
  }

  return { corrected, corrections };
}

/**
 * Pure function filtering restaurants based on user search parameters and active provider capabilities.
 * Audits every excluded place with reason breakdown (FR5).
 */
export function filterCandidates(
  places: Restaurant[],
  userLocation: LocationCoordinates,
  params: SearchParams,
  capabilities: ProviderCapabilities
): FilterResult {
  const candidateSet: Restaurant[] = [];
  const excludedAudits: ExclusionAudit[] = [];
  const reasonCounts: Record<ExclusionReason, number> = {
    price: 0,
    openNow: 0,
    rating: 0,
    reviews: 0,
    cuisine: 0,
    noRatingInfo: 0,
  };

  for (const place of places) {
    const reasons: ExclusionReason[] = [];

    // Distance check
    const dist = calculateDistanceMeters(userLocation, place);
    if (dist > params.radius) {
      // Distance is controlled by search query radius, but if any place exceeds:
      // (not listed as standard filter reason count, but filtered out)
      continue;
    }

    // Open now check
    if (capabilities.hasOpenNow && params.openNow) {
      if (place.openNow === false) {
        reasons.push('openNow');
      }
    }

    // Price level check
    if (capabilities.hasPriceLevel && params.priceLevels.length < 4) {
      if (place.priceLevel !== undefined && !params.priceLevels.includes(place.priceLevel)) {
        reasons.push('price');
      }
    }

    // Minimum rating & missing rating checks
    if (capabilities.hasRating && params.minRating > 0) {
      if (place.rating === undefined) {
        reasons.push('noRatingInfo');
      } else if (place.rating < params.minRating) {
        reasons.push('rating');
      }
    }

    // Minimum review count check
    if (capabilities.hasReviewCount && params.minReviews > 0) {
      if (place.reviewCount === undefined || place.reviewCount < params.minReviews) {
        reasons.push('reviews');
      }
    }

    // Cuisine filter check
    if (capabilities.hasCuisines && params.cuisines.length > 0) {
      if (!place.cuisine) {
        reasons.push('cuisine');
      } else {
        const placeCuisine = place.cuisine.toLowerCase();
        const matches = params.cuisines.some(
          (c) => placeCuisine.includes(c.toLowerCase()) || c.toLowerCase().includes(placeCuisine)
        );
        if (!matches) {
          reasons.push('cuisine');
        }
      }
    }

    if (reasons.length === 0) {
      candidateSet.push(place);
    } else {
      excludedAudits.push({
        restaurantId: place.id,
        restaurantName: place.name,
        reasons,
      });
      for (const r of reasons) {
        reasonCounts[r] += 1;
      }
    }
  }

  return {
    candidateSet,
    excludedAudits,
    reasonCounts,
    totalLoaded: places.length,
  };
}
