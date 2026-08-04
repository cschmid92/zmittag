import { LocationCoordinates, Restaurant, SearchParams } from '../types';

export interface ProviderCapabilities {
  hasRating: boolean;
  hasReviewCount: boolean;
  hasPriceLevel: boolean;
  hasOpenNow: boolean;
  hasCuisines: boolean;
  supportedCuisines?: string[];
}

export interface IRestaurantProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  
  fetchPlaces(
    location: LocationCoordinates,
    radius: number
  ): Promise<{ places: Restaurant[]; cachedAt: number }>;
}
