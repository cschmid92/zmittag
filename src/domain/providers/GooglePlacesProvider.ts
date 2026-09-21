import { LocationCoordinates, Restaurant, SearchParams } from '../types';
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

  /**
   * Performs a single sector search on Google Places API with pagination up to 60 results.
   */
  private fetchSingleSector(
    service: any,
    centerLat: number,
    centerLng: number,
    subRadius: number,
    params?: SearchParams
  ): Promise<any[]> {
    return new Promise((resolve) => {
      const request: any = {
        location: new window.google.maps.LatLng(centerLat, centerLng),
        radius: Math.min(subRadius, 50000),
        type: 'restaurant',
      };

      if (params) {
        if (params.openNow) {
          request.openNow = true;
        }
        if (params.priceLevels && params.priceLevels.length > 0) {
          request.minPriceLevel = Math.min(...params.priceLevels);
          request.maxPriceLevel = Math.max(...params.priceLevels);
        }
        if (params.cuisines && params.cuisines.length === 1) {
          request.keyword = params.cuisines[0];
        }
      }

      const sectorResults: any[] = [];

      const handleResults = (results: any[], status: any, pagination: any) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK ||
          status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          if (results && results.length > 0) {
            sectorResults.push(...results);
          }

          if (pagination && pagination.hasNextPage && sectorResults.length < 60) {
            setTimeout(() => {
              try {
                pagination.nextPage();
              } catch {
                resolve(sectorResults);
              }
            }, 250);
          } else {
            resolve(sectorResults);
          }
        } else {
          resolve(sectorResults);
        }
      };

      try {
        service.nearbySearch(request, handleResults);
      } catch {
        resolve(sectorResults);
      }
    });
  }

  async fetchPlaces(
    location: LocationCoordinates,
    radius: number,
    params?: SearchParams
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

    try {
      const service = new window.google.maps.places.PlacesService(mapDiv);

      // Determine sub-sector centers for multi-grid sampling when radius >= 2500m
      const sectorPoints: { lat: number; lng: number; subRadius: number }[] = [];

      if (radius >= 2500) {
        const offsetLat = (radius * 0.45) / 111320;
        const offsetLng = (radius * 0.45) / (111320 * Math.cos(location.lat * (Math.PI / 180)));
        const subRadius = Math.max(1000, Math.round(radius * 0.55));

        sectorPoints.push(
          { lat: location.lat, lng: location.lng, subRadius }, // Center
          { lat: location.lat + offsetLat, lng: location.lng, subRadius }, // North
          { lat: location.lat - offsetLat, lng: location.lng, subRadius }, // South
          { lat: location.lat, lng: location.lng + offsetLng, subRadius }, // East
          { lat: location.lat, lng: location.lng - offsetLng, subRadius } // West
        );
      } else {
        sectorPoints.push({ lat: location.lat, lng: location.lng, subRadius: radius });
      }

      // Query all sub-sectors in parallel
      const sectorPromises = sectorPoints.map((point) =>
        this.fetchSingleSector(service, point.lat, point.lng, point.subRadius, params)
      );

      const allSectorResultsArrays = await Promise.all(sectorPromises);

      if (document.body.contains(mapDiv)) {
        document.body.removeChild(mapDiv);
      }

      // Flatten and deduplicate by place_id
      const uniquePlacesMap = new Map<string, Restaurant>();

      for (const rawResults of allSectorResultsArrays) {
        for (const place of rawResults) {
          const placeId = place.place_id || Math.random().toString();
          if (uniquePlacesMap.has(placeId)) continue;

          const lat = place.geometry?.location?.lat() ?? location.lat;
          const lng = place.geometry?.location?.lng() ?? location.lng;
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

          const priceLevel =
            typeof place.price_level === 'number' && place.price_level > 0
              ? place.price_level
              : undefined;

          const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            name
          )}&query_place_id=${encodeURIComponent(placeId)}`;

          uniquePlacesMap.set(placeId, {
            id: placeId,
            name,
            lat,
            lng,
            rating: typeof place.rating === 'number' ? place.rating : undefined,
            reviewCount:
              typeof place.user_ratings_total === 'number' ? place.user_ratings_total : undefined,
            priceLevel,
            openNow: place.opening_hours?.open_now,
            cuisine,
            address: place.vicinity || place.formatted_address || '',
            mapUrl,
          });
        }
      }

      const places = Array.from(uniquePlacesMap.values());
      return { places, cachedAt: Date.now() };
    } catch (err) {
      if (document.body.contains(mapDiv)) {
        document.body.removeChild(mapDiv);
      }
      throw err;
    }
  }
}
