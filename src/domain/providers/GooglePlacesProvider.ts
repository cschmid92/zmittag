import { LocationCoordinates, Restaurant } from '../types';
import { IRestaurantProvider, ProviderCapabilities } from './types';

declare global {
  interface Window {
    google: any;
    gm_authFailure?: () => void;
  }
}

let scriptLoadingPromise: Promise<void> | null = null;
let authFailed = false;

if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    authFailed = true;
    console.error('Google Maps API Authentication Failed (gm_authFailure).');
  };
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (authFailed) {
    return Promise.reject(
      new Error(
        'Google Maps API Key Authentication Failed. Check API Key restrictions or billing on Google Cloud Console.'
      )
    );
  }

  if (window.google && window.google.maps && window.google.maps.places) {
    return Promise.resolve();
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      scriptLoadingPromise = null;
      reject(new Error('Google Maps SDK loading timed out (8s). Check ad-blockers or network.'));
    }, 8000);

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
      clearTimeout(timeoutId);
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      scriptLoadingPromise = null;
      reject(
        new Error(
          'Failed to load Google Maps SDK script. Please check VITE_GOOGLE_MAPS_API_KEY environment variable.'
        )
      );
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
      authFailed = false;
    }
  }

  async fetchPlaces(
    location: LocationCoordinates,
    radius: number
  ): Promise<{ places: Restaurant[]; cachedAt: number }> {
    if (authFailed) {
      throw new Error(
        'Google Maps API Key Authentication Failed. Check API Key restrictions or billing on Google Cloud Console.'
      );
    }

    const effectiveKey = this.apiKey || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

    if (!effectiveKey) {
      throw new Error(
        'Google Maps API Key is missing. Please set VITE_GOOGLE_MAPS_API_KEY in your Cloudflare environment variables.'
      );
    }

    await loadGoogleMapsScript(effectiveKey);

    if (authFailed) {
      throw new Error(
        'Google Maps API Key Authentication Failed. Check API Key restrictions or billing on Google Cloud Console.'
      );
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      throw new Error('Google Maps JS SDK is not available.');
    }

    const mapDiv = document.createElement('div');
    mapDiv.style.display = 'none';
    document.body.appendChild(mapDiv);

    return new Promise((resolve, reject) => {
      const searchTimeout = setTimeout(() => {
        if (document.body.contains(mapDiv)) document.body.removeChild(mapDiv);
        reject(new Error('Google Places search request timed out (10s).'));
      }, 10000);

      try {
        const service = new window.google.maps.places.PlacesService(mapDiv);
        const request = {
          location: new window.google.maps.LatLng(location.lat, location.lng),
          radius: Math.min(radius, 50000),
          type: 'restaurant',
        };

        service.nearbySearch(request, (results: any[], status: any) => {
          clearTimeout(searchTimeout);
          if (document.body.contains(mapDiv)) document.body.removeChild(mapDiv);

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

          const places: Restaurant[] = results.map((place: any) => {
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
      } catch (err) {
        clearTimeout(searchTimeout);
        if (document.body.contains(mapDiv)) document.body.removeChild(mapDiv);
        reject(err);
      }
    });
  }
}
