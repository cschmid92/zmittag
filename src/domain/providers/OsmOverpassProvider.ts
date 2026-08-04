import { LocationCoordinates, Restaurant } from '../types';
import { IRestaurantProvider, ProviderCapabilities } from './types';

export class OsmOverpassProvider implements IRestaurantProvider {
  readonly id = 'osm_overpass';
  readonly name = 'OpenStreetMap (Live Overpass API)';
  readonly capabilities: ProviderCapabilities = {
    hasRating: false,
    hasReviewCount: false,
    hasPriceLevel: false,
    hasOpenNow: true,
    hasCuisines: true,
    supportedCuisines: [
      'italian',
      'pizza',
      'burger',
      'asian',
      'japanese',
      'chinese',
      'indian',
      'mexican',
      'regional',
      'kebab',
    ],
  };

  async fetchPlaces(
    location: LocationCoordinates,
    radius: number
  ): Promise<{ places: Restaurant[]; cachedAt: number }> {
    const lat = location.lat;
    const lng = location.lng;

    // Overpass QL query for food amenities within radius meters
    const query = `
      [out:json][timeout:10];
      (
        node["amenity"~"restaurant|cafe|fast_food|bistro|pub"](around:${radius},${lat},${lng});
        way["amenity"~"restaurant|cafe|fast_food|bistro|pub"](around:${radius},${lat},${lng});
      );
      out center 50;
    `;

    const url = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`OpenStreetMap Overpass API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const elements = data.elements || [];

    const places: Restaurant[] = elements
      .map((el: any) => {
        const tags = el.tags || {};
        const pLat = el.lat || el.center?.lat;
        const pLng = el.lon || el.center?.lon;
        const name = tags.name || tags['name:en'] || tags['name:de'] || 'Unnamed Eatery';

        if (!pLat || !pLng || !tags.name) {
          return null; // Skip unnamed locations or invalid geometry
        }

        const street = tags['addr:street'] || '';
        const houseNr = tags['addr:housenumber'] || '';
        const city = tags['addr:city'] || '';
        const fullAddress = [street, houseNr, city].filter(Boolean).join(' ') || 'Nearby address';

        const mapUrl = `https://www.openstreetmap.org/?mlat=${pLat}&mlon=${pLng}#map=17/${pLat}/${pLng}`;

        return {
          id: `osm-${el.id}`,
          name,
          lat: pLat,
          lng: pLng,
          rating: undefined,
          reviewCount: undefined,
          priceLevel: undefined,
          openNow: tags.opening_hours ? !tags.opening_hours.includes('closed') : true,
          cuisine: tags.cuisine ? tags.cuisine.split(';')[0].trim() : tags.amenity,
          address: fullAddress,
          phone: tags.phone || tags['contact:phone'],
          website: tags.website || tags['contact:website'],
          mapUrl,
        } as Restaurant;
      })
      .filter((p: Restaurant | null): p is Restaurant => p !== null)
      .slice(0, 50);

    return {
      places,
      cachedAt: Date.now(),
    };
  }
}
