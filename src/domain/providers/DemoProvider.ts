import { LocationCoordinates, Restaurant } from '../types';
import { IRestaurantProvider, ProviderCapabilities } from './types';
import { calculateDistanceMeters } from '../geoUtils';

const MOCK_RESTAURANT_TEMPLATES = [
  {
    name: 'Ristorante Pizzeria Trevi',
    cuisine: 'Italian',
    rating: 4.6,
    reviewCount: 184,
    priceLevel: 2,
    openNow: true,
    addressOffset: 'Hauptstrasse 14',
    phone: '+41 44 211 40 50',
    relLat: 0.002,
    relLng: 0.003,
  },
  {
    name: 'Zunfthaus zur Waag',
    cuisine: 'Swiss',
    rating: 4.8,
    reviewCount: 312,
    priceLevel: 4,
    openNow: true,
    addressOffset: 'Münsterhof 8',
    phone: '+41 44 216 99 66',
    relLat: -0.0015,
    relLng: 0.0025,
  },
  {
    name: 'Ramen Ya Express',
    cuisine: 'Japanese',
    rating: 4.4,
    reviewCount: 95,
    priceLevel: 2,
    openNow: true,
    addressOffset: 'Bahnhofquai 7',
    phone: '+41 44 300 12 34',
    relLat: 0.0035,
    relLng: -0.001,
  },
  {
    name: 'Green Oasis Salad Bar',
    cuisine: 'Vegetarian',
    rating: 4.2,
    reviewCount: 48,
    priceLevel: 1,
    openNow: true,
    addressOffset: 'Löwenstrasse 22',
    phone: '+41 44 555 88 99',
    relLat: -0.003,
    relLng: -0.004,
  },
  {
    name: 'Burger & Craft Brew Depot',
    cuisine: 'Burger',
    rating: 4.5,
    reviewCount: 215,
    priceLevel: 2,
    openNow: true,
    addressOffset: 'Langstrasse 102',
    phone: '+41 44 480 33 22',
    relLat: 0.005,
    relLng: 0.006,
  },
  {
    name: 'Taj Mahal Indian Spices',
    cuisine: 'Indian',
    rating: 4.7,
    reviewCount: 160,
    priceLevel: 3,
    openNow: true,
    addressOffset: 'Badenerstrasse 55',
    phone: '+41 44 321 77 00',
    relLat: -0.0045,
    relLng: 0.005,
  },
  {
    name: 'El Taco Loco',
    cuisine: 'Mexican',
    rating: 4.1,
    reviewCount: 34,
    priceLevel: 1,
    openNow: true,
    addressOffset: 'Josefstrasse 18',
    phone: '+41 44 999 11 22',
    relLat: 0.006,
    relLng: -0.0035,
  },
  {
    name: 'Café de la Paix',
    cuisine: 'French',
    rating: 4.3,
    reviewCount: 78,
    priceLevel: 3,
    openNow: false, // Closed for testing openNow filter!
    addressOffset: 'Kirchgasse 4',
    phone: '+41 44 260 00 11',
    relLat: 0.001,
    relLng: -0.002,
  },
  {
    name: 'QuickBite Döner & Falafel',
    cuisine: 'Fast Food',
    rating: 3.8,
    reviewCount: 18, // Low reviews for testing minReviews filter!
    priceLevel: 1,
    openNow: true,
    addressOffset: 'Limmatquai 42',
    phone: '+41 44 111 22 33',
    relLat: -0.002,
    relLng: -0.001,
  },
  {
    name: 'Bistro du Marché',
    cuisine: 'French',
    rating: 4.9,
    reviewCount: 420,
    priceLevel: 3,
    openNow: true,
    addressOffset: 'Marktgasse 15',
    phone: '+41 44 888 77 66',
    relLat: 0.004,
    relLng: 0.002,
  },
  {
    name: 'Golden Dragon Dim Sum',
    cuisine: 'Asian',
    rating: 4.0,
    reviewCount: 65,
    priceLevel: 2,
    openNow: true,
    addressOffset: 'Neugasse 30',
    phone: '+41 44 777 44 55',
    relLat: -0.006,
    relLng: 0.008,
  },
  {
    name: 'Subway Station Bistro',
    cuisine: 'Fast Food',
    rating: 3.5, // Low rating for testing minRating filter!
    reviewCount: 120,
    priceLevel: 1,
    openNow: true,
    addressOffset: 'Bahnhofplatz 1',
    phone: '+41 44 000 00 00',
    relLat: 0.007,
    relLng: -0.007,
  },
];

export class DemoProvider implements IRestaurantProvider {
  readonly id = 'demo';
  readonly name = 'Demo Provider (Static Dataset)';
  readonly capabilities: ProviderCapabilities = {
    hasRating: true,
    hasReviewCount: true,
    hasPriceLevel: true,
    hasOpenNow: true,
    hasCuisines: true,
    supportedCuisines: [
      'Italian',
      'Swiss',
      'Japanese',
      'Vegetarian',
      'Burger',
      'Indian',
      'Mexican',
      'French',
      'Fast Food',
      'Asian',
    ],
  };

  async fetchPlaces(
    location: LocationCoordinates,
    radius: number
  ): Promise<{ places: Restaurant[]; cachedAt: number }> {
    // Simulate slight network delay for realism (100ms)
    await new Promise((resolve) => setTimeout(resolve, 80));

    const baseCity = location.displayName || 'Current Location';

    const places: Restaurant[] = MOCK_RESTAURANT_TEMPLATES.map((tmpl, idx) => {
      const lat = location.lat + tmpl.relLat;
      const lng = location.lng + tmpl.relLng;
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

      return {
        id: `demo-${idx + 1}`,
        name: tmpl.name,
        lat,
        lng,
        rating: tmpl.rating,
        reviewCount: tmpl.reviewCount,
        priceLevel: tmpl.priceLevel,
        openNow: tmpl.openNow,
        cuisine: tmpl.cuisine,
        address: `${tmpl.addressOffset}, ${baseCity}`,
        phone: tmpl.phone,
        mapUrl,
      };
    }).filter((place) => calculateDistanceMeters(location, place) <= Math.max(radius, 5000));

    return {
      places,
      cachedAt: Date.now(),
    };
  }
}
