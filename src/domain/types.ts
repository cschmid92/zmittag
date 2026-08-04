export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number; // in meters
  displayName?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rating?: number; // 0.0 - 5.0
  reviewCount?: number;
  priceLevel?: number; // 1 - 4 ($ to $$$$)
  openNow?: boolean;
  cuisine?: string;
  address: string;
  website?: string;
  phone?: string;
  mapUrl?: string;
}

export interface SearchParams {
  radius: number; // 250 to 10000 m (default 1500)
  minRating: number; // 0.0 to 5.0 (default 4.0)
  minReviews: number; // 0 to 1000 (default 25)
  priceLevels: number[]; // [1, 2, 3, 4]
  openNow: boolean; // default true
  cuisines: string[]; // empty means all
  favourHigherRated: boolean; // default false
}

export const DEFAULT_SEARCH_PARAMS: SearchParams = {
  radius: 1500,
  minRating: 4.0,
  minReviews: 25,
  priceLevels: [1, 2, 3, 4],
  openNow: true,
  cuisines: [],
  favourHigherRated: false,
};

export type ExclusionReason =
  | 'price'
  | 'openNow'
  | 'rating'
  | 'reviews'
  | 'cuisine'
  | 'noRatingInfo';

export interface ExclusionAudit {
  restaurantId: string;
  restaurantName: string;
  reasons: ExclusionReason[];
}

export interface FilterResult {
  candidateSet: Restaurant[];
  excludedAudits: ExclusionAudit[];
  reasonCounts: Record<ExclusionReason, number>;
  totalLoaded: number;
}

export interface RelaxationStep {
  type: 'droppedExclusionList' | 'expandedRadius' | 'reducedMinReviews' | 'reducedMinRating';
  messageEn: string;
  messageDe: string;
  newValue: number | string | boolean;
}

export interface SpinResult {
  selected: Restaurant | null;
  candidateCount: number;
  totalPlacesLoaded: number;
  appliedRelaxations: RelaxationStep[];
  providerId: string;
  providerName: string;
  cachedAt: number;
  emptyStateExplanation?: {
    mostCommonReason: ExclusionReason;
    count: number;
    recommendationEn: string;
    recommendationDe: string;
  };
}

export interface ParameterCorrection {
  field: keyof SearchParams;
  originalValue: unknown;
  correctedValue: unknown;
  messageEn: string;
  messageDe: string;
}
