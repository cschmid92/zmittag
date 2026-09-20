export type Language = 'en' | 'de';

export interface TranslationSchema {
  appTitle: string;
  appSubtitle: string;
  spinButton: string;
  spinning: string;
  respin: string;
  filters: string;
  location: string;
  useMyLocation: string;
  manualLocation: string;
  locationAccuracyWarning: (acc: number) => string;
  locationDenied: string;
  enterCityOrAddress: string;
  searchLocation: string;
  radius: string;
  minRating: string;
  minReviews: string;
  priceLevel: string;
  openNow: string;
  cuisine: string;
  favourHigherRated: string;
  allCuisines: string;
  anyPrice: string;
  walkingTime: (mins: number) => string;
  distance: (distStr: string) => string;
  openInMaps: string;
  copyShareText: string;
  copiedShareText: string;
  dataSource: string;
  cachedAge: (mins: number) => string;
  unsupportedByProvider: string;
  candidateCount: (count: number) => string;
  appliedRelaxationNotice: string;
  noResultsTitle: string;
  retry: string;
  resetFilters: string;
  apiKeyRequiredTitle: string;
  apiKeyRequiredDesc: string;
  apiKeyInputLabel: string;
  saveApiKey: string;
  configureApiKey: string;
  apiKeyConfigured: string;
  ariaSpinAnnouncement: (name: string, rating: string, reviews: number) => string;
  ariaNoResultsAnnouncement: string;
}

export const translations: Record<Language, TranslationSchema> = {
  en: {
    appTitle: 'Restaurant Roulette',
    appSubtitle: 'One spin. One pick. Zero lunch arguments.',
    spinButton: 'Spin the Roulette',
    spinning: 'Finding your spot...',
    respin: 'Spin Again',
    filters: 'Filters & Preferences',
    location: 'Location',
    useMyLocation: 'Use My Geolocation',
    manualLocation: 'Set Location Manually',
    locationAccuracyWarning: (acc) => `Low GPS accuracy (~${acc}m). Distance calculations may vary.`,
    locationDenied: 'Location access denied or unavailable. Please search manually.',
    enterCityOrAddress: 'Enter address, city, or postal code...',
    searchLocation: 'Set Location',
    radius: 'Search Radius',
    minRating: 'Minimum Rating',
    minReviews: 'Minimum Reviews',
    priceLevel: 'Price Tier',
    openNow: 'Open Right Now',
    cuisine: 'Cuisine Type',
    favourHigherRated: 'Favour Higher Rated Places',
    allCuisines: 'All Cuisines',
    anyPrice: 'Any Price Level',
    walkingTime: (mins) => `~${mins} min walk`,
    distance: (distStr) => `${distStr} away`,
    openInMaps: 'Open Route & Details in Maps',
    copyShareText: 'Share Recommendation',
    copiedShareText: 'Copied to Clipboard!',
    dataSource: 'Data Source',
    cachedAge: (mins) => (mins < 1 ? 'Just updated' : `Cached ${mins}m ago`),
    unsupportedByProvider: 'Not supported by active provider',
    candidateCount: (count) => `${count} candidate places match your active filters`,
    appliedRelaxationNotice: 'Filters automatically relaxed:',
    noResultsTitle: 'No Matching Restaurants Found',
    retry: 'Try Again',
    resetFilters: 'Reset Filters to Default',
    apiKeyRequiredTitle: 'Google Maps API Key Required',
    apiKeyRequiredDesc: 'Please enter your Google Maps API key (with Maps JS & Places API enabled) to start finding restaurants.',
    apiKeyInputLabel: 'Google Maps API Key',
    saveApiKey: 'Save API Key',
    configureApiKey: 'Google Maps Settings',
    apiKeyConfigured: 'Google Maps API Key configured',
    ariaSpinAnnouncement: (name, rating, reviews) =>
      `Selected restaurant: ${name}, rated ${rating} out of 5 stars from ${reviews} reviews.`,
    ariaNoResultsAnnouncement: 'No restaurants found with current criteria. Check recommendations below.',
  },
  de: {
    appTitle: 'Restaurant Roulette',
    appSubtitle: 'Ein Spin. Eine Entscheidung. Keine Mittagsdebatten.',
    spinButton: 'Roulette Drehen',
    spinning: 'Suche passendes Restaurant...',
    respin: 'Nochmal Drehen',
    filters: 'Filter & Einstellungen',
    location: 'Standort',
    useMyLocation: 'Meinen Standort Verwenden',
    manualLocation: 'Standort Manuell Eingeben',
    locationAccuracyWarning: (acc) => `Niedrige GPS-Genauigkeit (~${acc}m). Distanzangaben können abweichen.`,
    locationDenied: 'Standortzugriff verweigert oder nicht verfügbar. Bitte manuell eingeben.',
    enterCityOrAddress: 'Adresse, Stadt oder PLZ eingeben...',
    searchLocation: 'Standort Festlegen',
    radius: 'Suchradius',
    minRating: 'Mindestbewertung',
    minReviews: 'Mindestanzahl Bewertungen',
    priceLevel: 'Preiskategorie',
    openNow: 'Jetzt Geöffnet',
    cuisine: 'Küchenrichtung',
    favourHigherRated: 'Höher bewertete Orte bevorzugen',
    allCuisines: 'Alle Küchen',
    anyPrice: 'Alle Preiskategorien',
    walkingTime: (mins) => `ca. ${mins} Min. zu Fuß`,
    distance: (distStr) => `${distStr} entfernt`,
    openInMaps: 'Route & Details in Karte Öffnen',
    copyShareText: 'Empfehlung Teilen',
    copiedShareText: 'In Zwischenablage kopiert!',
    dataSource: 'Datenquelle',
    cachedAge: (mins) => (mins < 1 ? 'Gerade aktualisiert' : `Vor ${mins} Min. geladen`),
    unsupportedByProvider: 'Vom aktiven Anbieter nicht unterstützt',
    candidateCount: (count) => `${count} passende Orte erfüllen deine Kriterien`,
    appliedRelaxationNotice: 'Filter wurden automatisch gelockert:',
    noResultsTitle: 'Kein passendes Restaurant gefunden',
    retry: 'Erneut versuchen',
    resetFilters: 'Filter auf Standard zurücksetzen',
    apiKeyRequiredTitle: 'Google Maps API-Schlüssel erforderlich',
    apiKeyRequiredDesc: 'Bitte gib deinen Google Maps API-Schlüssel (mit Maps JS & Places API) ein, um passende Restaurants zu finden.',
    apiKeyInputLabel: 'Google Maps API-Schlüssel',
    saveApiKey: 'Schlüssel Speichern',
    configureApiKey: 'Google Maps Einstellungen',
    apiKeyConfigured: 'Google Maps API-Schlüssel konfiguriert',
    ariaSpinAnnouncement: (name, rating, reviews) =>
      `Ausgewähltes Restaurant: ${name}, bewertet mit ${rating} von 5 Sternen aus ${reviews} Bewertungen.`,
    ariaNoResultsAnnouncement: 'Kein Restaurant mit den aktuellen Kriterien gefunden. Siehe Empfehlungen.',
  },
};
