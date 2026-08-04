import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_SEARCH_PARAMS,
  LocationCoordinates,
  Restaurant,
  SearchParams,
  SpinResult,
} from './domain/types';
import { DemoProvider } from './domain/providers/DemoProvider';
import { OsmOverpassProvider } from './domain/providers/OsmOverpassProvider';
import { executeSpin, SpinSessionState } from './domain/spinEngine';
import { filterCandidates } from './domain/filterEngine';
import { getLocationCellKey } from './domain/geoUtils';

import { Language, translations } from './i18n/translations';
import {
  loadSavedLanguage,
  loadSavedParams,
  loadSavedProvider,
  saveLanguage,
  saveParams,
  saveProvider,
} from './services/storageService';

import { Header } from './components/Header';
import { LocationBanner } from './components/LocationBanner';
import { FilterPanel } from './components/FilterPanel';
import { RouletteSpinner } from './components/RouletteSpinner';
import { ResultCard } from './components/ResultCard';
import { EmptyState } from './components/EmptyState';

// Provider Registry
const demoProvider = new DemoProvider();
const osmProvider = new OsmOverpassProvider();
const providersMap = {
  demo: demoProvider,
  osm_overpass: osmProvider,
};

export const App: React.FC = () => {
  // Theme & i18n state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<Language>(loadSavedLanguage);
  const t = useMemo(() => translations[lang], [lang]);

  // Active Provider State
  const [activeProviderId, setActiveProviderId] = useState<string>(loadSavedProvider);
  const activeProvider = providersMap[activeProviderId as keyof typeof providersMap] || demoProvider;

  // Location State (Default: Zurich Center fallback until user action)
  const [location, setLocation] = useState<LocationCoordinates | null>({
    lat: 47.3769,
    lng: 8.5417,
    displayName: 'Zürich Center',
    accuracy: 25,
  });
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Search Parameters State (Persisted in LocalStorage)
  const [params, setParams] = useState<SearchParams>(loadSavedParams);

  // Places Cache: Map<cellKey, { places: Restaurant[]; cachedAt: number }>
  const placesCache = useRef<Map<string, { places: Restaurant[]; cachedAt: number }>>(
    new Map()
  );

  // Session Exclusion State (FR7)
  const [sessionState, setSessionState] = useState<SpinSessionState>({
    lastSuggestions: [],
    rejectedIds: new Set<string>(),
  });

  // Spin State & Results
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  const spinCancelRef = useRef<boolean>(false);

  // Sync parameters & preferences to LocalStorage
  const handleParamsChange = (newParams: SearchParams) => {
    setParams(newParams);
    saveParams(newParams);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    saveLanguage(newLang);
  };

  const handleProviderChange = (newProviderId: string) => {
    setActiveProviderId(newProviderId);
    saveProvider(newProviderId);
    setSpinResult(null);
  };

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Browser Geolocation Acquisition (FR1: only on explicit action)
  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError(t.locationDenied);
      return;
    }

    setIsLoadingGeo(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLoadingGeo(false);
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          displayName: 'Current Location',
        });
      },
      (err) => {
        setIsLoadingGeo(false);
        setGeoError(err.message || t.locationDenied);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Load places for current location (with 5-minute cache per cell key - FR4.2)
  const loadPlacesForLocation = async (
    loc: LocationCoordinates,
    radius: number
  ): Promise<{ places: Restaurant[]; cachedAt: number }> => {
    const cellKey = `${activeProviderId}_${getLocationCellKey(loc, radius)}`;
    const cached = placesCache.current.get(cellKey);
    const FIVE_MINS = 5 * 60 * 1000;

    if (cached && Date.now() - cached.cachedAt < FIVE_MINS) {
      return cached;
    }

    const fetched = await activeProvider.fetchPlaces(loc, radius);
    placesCache.current.set(cellKey, fetched);
    return fetched;
  };

  // Calculate current candidate count for live UI count badge
  const [candidateCount, setCandidateCount] = useState<number>(0);
  useEffect(() => {
    if (!location) return;
    loadPlacesForLocation(location, params.radius).then(({ places }) => {
      const res = filterCandidates(places, location, params, activeProvider.capabilities);
      setCandidateCount(res.candidateSet.length);
    });
  }, [location, params, activeProviderId]);

  // Spin Trigger Engine (FR4, FR6, FR7, FR8)
  const handleSpin = async () => {
    if (!location) {
      handleRequestGeolocation();
      return;
    }

    setIsSpinning(true);
    spinCancelRef.current = false;

    try {
      // Simulate non-blocking roulette animation (600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (spinCancelRef.current) return;

      const { places, cachedAt } = await loadPlacesForLocation(location, params.radius);

      const result = executeSpin(
        places,
        location,
        params,
        activeProvider.capabilities,
        activeProvider.id,
        activeProvider.name,
        sessionState,
        cachedAt
      );

      if (spinCancelRef.current) return;

      setSpinResult(result);

      if (result.selected) {
        // Track last 10 suggestions (FR7.1)
        const updatedLast = [
          result.selected.id,
          ...sessionState.lastSuggestions.filter((id) => id !== result.selected?.id),
        ].slice(0, 10);

        setSessionState((prev) => ({
          ...prev,
          lastSuggestions: updatedLast,
        }));

        setAriaAnnouncement(
          t.ariaSpinAnnouncement(
            result.selected.name,
            (result.selected.rating || 0).toFixed(1),
            result.selected.reviewCount || 0
          )
        );
      } else {
        setAriaAnnouncement(t.ariaNoResultsAnnouncement);
      }
    } catch (err: any) {
      alert(`Provider Error: ${err.message || 'Failed to fetch places'}`);
    } finally {
      setIsSpinning(false);
    }
  };

  const handleCancelSpin = () => {
    spinCancelRef.current = true;
    setIsSpinning(false);
  };

  const handleRejectAndRespin = (id: string) => {
    setSessionState((prev) => {
      const newRejected = new Set(prev.rejectedIds);
      newRejected.add(id);
      return {
        ...prev,
        rejectedIds: newRejected,
      };
    });
    handleSpin();
  };

  return (
    <div className="app-container">
      <Header
        t={t}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        activeProviderId={activeProviderId}
        onProviderChange={handleProviderChange}
      />

      <main style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <LocationBanner
          t={t}
          location={location}
          onLocationChange={setLocation}
          isLoadingGeo={isLoadingGeo}
          onRequestGeolocation={handleRequestGeolocation}
          geoError={geoError}
        />

        <FilterPanel
          t={t}
          params={params}
          onChange={handleParamsChange}
          capabilities={activeProvider.capabilities}
          candidateCount={candidateCount}
        />

        <RouletteSpinner
          t={t}
          isSpinning={isSpinning}
          onSpin={handleSpin}
          onCancel={handleCancelSpin}
          ariaAnnouncement={ariaAnnouncement}
        />

        {/* Display Spin Result or Empty State */}
        {spinResult && location && (
          spinResult.selected ? (
            <ResultCard
              t={t}
              restaurant={spinResult.selected}
              userLocation={location}
              providerName={spinResult.providerName}
              cachedAt={spinResult.cachedAt}
              appliedRelaxations={spinResult.appliedRelaxations}
              onRespin={handleSpin}
              onRejectAndRespin={handleRejectAndRespin}
            />
          ) : (
            <EmptyState
              t={t}
              explanation={spinResult.emptyStateExplanation}
              onResetFilters={() => handleParamsChange(DEFAULT_SEARCH_PARAMS)}
            />
          )
        )}
      </main>

      <footer style={{ marginTop: 'auto', padding: '1.5rem 0', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Restaurant Roulette (zmittag) • Swiss revDSG & EU GDPR Compliant • No Tracking
      </footer>
    </div>
  );
};
