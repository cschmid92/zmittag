import {
  ExclusionReason,
  LocationCoordinates,
  RelaxationStep,
  Restaurant,
  SearchParams,
  SpinResult,
} from './types';
import { ProviderCapabilities } from './providers/types';
import { filterCandidates } from './filterEngine';

export interface SpinSessionState {
  lastSuggestions: string[]; // up to 10 recent suggestion IDs
  rejectedIds: Set<string>; // explicitly rejected IDs
}

export type RandomSource = () => number;

/**
 * Selects a random candidate from array using provided PRNG.
 * Uniform by default, weighted if favourHigherRated is true.
 */
export function selectCandidate(
  candidates: Restaurant[],
  favourHigherRated: boolean,
  randomSource: RandomSource = Math.random
): Restaurant {
  if (candidates.length === 0) {
    throw new Error('Cannot select candidate from empty array');
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (!favourHigherRated) {
    const idx = Math.floor(randomSource() * candidates.length);
    return candidates[idx];
  }

  // Weighted selection formula: weight(r) = (rating || 4.0)^2.5
  const weights = candidates.map((c) => {
    const r = c.rating ?? 4.0;
    return Math.pow(Math.max(0.1, r), 2.5);
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  let threshold = randomSource() * totalWeight;

  for (let i = 0; i < candidates.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) {
      return candidates[i];
    }
  }

  return candidates[candidates.length - 1];
}

/**
 * Executes a spin with automatic constraint relaxation if candidate set is empty.
 */
export function executeSpin(
  places: Restaurant[],
  userLocation: LocationCoordinates,
  initialParams: SearchParams,
  capabilities: ProviderCapabilities,
  providerId: string,
  providerName: string,
  sessionState: SpinSessionState,
  cachedAt: number,
  randomSource: RandomSource = Math.random
): SpinResult {
  let activeParams: SearchParams = { ...initialParams };
  let activeSessionState: SpinSessionState = {
    lastSuggestions: [...sessionState.lastSuggestions],
    rejectedIds: new Set(sessionState.rejectedIds),
  };

  const appliedRelaxations: RelaxationStep[] = [];
  let isExclusionListActive = true;

  const runFiltering = (params: SearchParams, session: SpinSessionState) => {
    const baseResult = filterCandidates(places, userLocation, params, capabilities);

    if (!isExclusionListActive) {
      return baseResult;
    }

    // Apply session exclusions
    const excludedSet = new Set([...session.lastSuggestions, ...session.rejectedIds]);
    const filteredCandidates = baseResult.candidateSet.filter(
      (place) => !excludedSet.has(place.id)
    );

    return {
      ...baseResult,
      candidateSet: filteredCandidates,
    };
  };

  let filterRes = runFiltering(activeParams, activeSessionState);

  // Relaxation loop: if candidate set is empty, loosen in fixed order (FR8)
  // Order: 1) drop exclusions, 2) double radius up to 10000, 3) reduce min reviews, 4) reduce min rating in 0.5 steps
  while (filterRes.candidateSet.length === 0) {
    // Step 1: Drop exclusion list
    if (
      isExclusionListActive &&
      (activeSessionState.lastSuggestions.length > 0 || activeSessionState.rejectedIds.size > 0)
    ) {
      isExclusionListActive = false;
      appliedRelaxations.push({
        type: 'droppedExclusionList',
        newValue: false,
        messageEn: 'Previously shown or rejected places included back',
        messageDe: 'Bisher gezeigte oder abgelehnte Orte wieder eingeschlossen',
      });
      filterRes = runFiltering(activeParams, activeSessionState);
      if (filterRes.candidateSet.length > 0) break;
    }

    // Step 2: Double radius up to 10,000m
    if (activeParams.radius < 10000) {
      const newRadius = Math.min(10000, activeParams.radius * 2);
      appliedRelaxations.push({
        type: 'expandedRadius',
        newValue: newRadius,
        messageEn: `Radius expanded from ${activeParams.radius}m to ${newRadius}m`,
        messageDe: `Radius von ${activeParams.radius}m auf ${newRadius}m erweitert`,
      });
      activeParams.radius = newRadius;
      filterRes = runFiltering(activeParams, activeSessionState);
      if (filterRes.candidateSet.length > 0) break;
      continue;
    }

    // Step 3: Reduce minimum review count (e.g. 25 -> 10 -> 0)
    if (activeParams.minReviews > 0 && capabilities.hasReviewCount) {
      const newReviews = activeParams.minReviews > 10 ? 10 : 0;
      appliedRelaxations.push({
        type: 'reducedMinReviews',
        newValue: newReviews,
        messageEn: `Minimum review count lowered from ${activeParams.minReviews} to ${newReviews}`,
        messageDe: `Mindestanzahl Bewertungen von ${activeParams.minReviews} auf ${newReviews} gesenkt`,
      });
      activeParams.minReviews = newReviews;
      filterRes = runFiltering(activeParams, activeSessionState);
      if (filterRes.candidateSet.length > 0) break;
      continue;
    }

    // Step 4: Reduce minimum rating in steps of 0.5
    if (activeParams.minRating > 0 && capabilities.hasRating) {
      const newRating = Math.max(0.0, Math.round((activeParams.minRating - 0.5) * 10) / 10);
      appliedRelaxations.push({
        type: 'reducedMinRating',
        newValue: newRating,
        messageEn: `Minimum rating lowered from ${activeParams.minRating.toFixed(
          1
        )} to ${newRating.toFixed(1)}`,
        messageDe: `Mindestbewertung von ${activeParams.minRating.toFixed(
          1
        )} auf ${newRating.toFixed(1)} gesenkt`,
      });
      activeParams.minRating = newRating;
      filterRes = runFiltering(activeParams, activeSessionState);
      if (filterRes.candidateSet.length > 0) break;
      continue;
    }

    // If fully relaxed and still empty, break loop
    break;
  }

  // Handle empty state explanation if no candidates found
  if (filterRes.candidateSet.length === 0) {
    let mostCommonReason: ExclusionReason = 'rating';
    let maxCount = 0;

    for (const [r, count] of Object.entries(filterRes.reasonCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonReason = r as ExclusionReason;
      }
    }

    const explanations: Record<
      ExclusionReason,
      { recommendationEn: string; recommendationDe: string }
    > = {
      price: {
        recommendationEn: 'Try expanding price levels ($ - $$$$) to see more choices.',
        recommendationDe: 'Versuche weitere Preiskategorien ($ - $$$$) auszuwählen.',
      },
      openNow: {
        recommendationEn: 'Uncheck "Open now" or check back during normal meal hours.',
        recommendationDe: 'Deaktiviere "Jetzt geöffnet" oder versuche es zu den gewohnten Öffnungszeiten.',
      },
      rating: {
        recommendationEn: 'Lower the minimum rating filter to discover local hidden gems.',
        recommendationDe: 'Senke die Mindestbewertung, um Geheimtipps zu entdecken.',
      },
      reviews: {
        recommendationEn: 'Reduce minimum review count to include newer places.',
        recommendationDe: 'Senke die Mindestanzahl an Bewertungen für neuere Restaurants.',
      },
      cuisine: {
        recommendationEn: 'Clear specific cuisine selections to see all available options.',
        recommendationDe: 'Entferne die Küchen-Filterung, um alle Optionen zu sehen.',
      },
      noRatingInfo: {
        recommendationEn: 'Lower minimum rating to 0 to include places without rating data.',
        recommendationDe: 'Setze die Mindestbewertung auf 0, um auch Orte ohne Bewertung zu sehen.',
      },
    };

    return {
      selected: null,
      candidateCount: 0,
      totalPlacesLoaded: places.length,
      appliedRelaxations,
      providerId,
      providerName,
      cachedAt,
      emptyStateExplanation: {
        mostCommonReason,
        count: maxCount,
        ...explanations[mostCommonReason],
      },
    };
  }

  const selected = selectCandidate(
    filterRes.candidateSet,
    initialParams.favourHigherRated,
    randomSource
  );

  return {
    selected,
    candidateCount: filterRes.candidateSet.length,
    totalPlacesLoaded: places.length,
    appliedRelaxations,
    providerId,
    providerName,
    cachedAt,
  };
}
