import { LocationCoordinates, Restaurant } from '../types';
import { IRestaurantProvider, ProviderCapabilities } from './types';

declare global {
  interface Window {
    google: any;
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-js-sdk');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'google-maps-js-sdk';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error('Failed to load Google Maps SDK script. Please check VITE_GOOGLE_MAPS_API_KEY environment variable.'));
    };

    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

export class GooglePlacesProvider implements IRestaurantProvider {
  readonly id = 'google_places';
  readonly name = 'Google Maps Places API';
  private apiKey: string;

  readonly capabilities: ProviderCapabilities = {
    hasRating: true,
    hasReviewCount: true,
    hasPriceLevel: true,
    hasOpenNow: true,
    hasCuisines: true,
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ?? '';
  }

  setApiKey(apiKey: string) {
    if (this.apiKey !== apiKey) {
      this.apiKey = apiKey;
      scriptLoadingPromise = null;
    }
  }

  async fetchPlaces(
    location: LocationCoordinates,
    radius: number
  ): Promise<{ places: Restaurant[]; cachedAt: number }> {
    const effectiveKey = this.apiKey || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

    if (!effectiveKey) {
      throw new Error('Google Maps API Key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.');
    }

    await loadGoogleMapsScript(effectiveKey);

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      throw new Error('Google Maps JS SDK is not available.');
    }

    const mapDiv = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(mapDiv);

    const request = {
      location: new window.google.maps.LatLng(location.lat, location.lng),
      radius: Math.min(radius, 50000),
      type: 'restaurant',
    };

    return new Promise((resolve, reject) => {
      service.nearbySearch(request, (results: any[], status: any) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK &&
          status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          reject(new Error(`Google Places API search failed with status: ${status}`));
          return;
        }

        if (!results || results.length === 0) {
          resolve({ places: [], cachedAt: Date.now() });
          return;
        }

        const places: Restaurant[] = results.map((place) => {
          const lat = place.geometry?.location?.lat() ?? location.lat;
          const lng = place.geometry?.location?.lng() ?? location.lng;
          const placeId = place.place_id || Math.random().toString();
          const name = place.name || 'Unknown Restaurant';

          const excludeTypes = new Set([
            'restaurant',
            'food',
            'point_of_interest',
            'establishment',
            'bar',
            'cafe',
            'store',
          ]);
          const rawCuisine = (place.types || []).find((t: string) => !excludeTypes.has(t));
          const cuisine = rawCuisine
            ? rawCuisine.replace(/_restaurant|_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
            : undefined;

          const priceLevel = typeof place.price_level === 'number' && place.price_level > 0 ? place.price_level : undefined;

          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            name
          )}&query_place_id=${encodeURIComponent(placeId)}`;

          return {
            id: placeId,
            name,
            lat,
            lng,
            rating: typeof place.rating === 'number' ? place.rating : undefined,
            reviewCount: typeof place.user_ratings_total === 'number' ? place.user_ratings_total : undefined,
            priceLevel,
            openNow: place.opening_hours?.open_now,
            cuisine,
            address: place.vicinity || place.formatted_address || '',
            mapUrl,
          };
        });

        resolve({ places, cachedAt: Date.now() });
      });
    });
  }
}
