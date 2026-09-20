import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_SEARCH_PARAMS,
  LocationCoordinates,
  Restaurant,
  SearchParams,
  SpinResult,
} from './domain/types';
import { GooglePlacesProvider } from './domain/providers/GooglePlacesProvider';
import { executeSpin, SpinSessionState } from './domain/spinEngine';
import { filterCandidates } from './domain/filterEngine';
import { getLocationCellKey } from './domain/geoUtils';

import { Language, translations } from './i18n/translations';
import {
  loadSavedLanguage,
  loadSavedParams,
  saveLanguage,
  saveParams,
} from './services/storageService';

import { Header } from './components/Header';
import { LocationBanner } from './components/LocationBanner';
import { FilterPanel } from './components/FilterPanel';
import { RouletteSpinner } from './components/RouletteSpinner';
import { ResultCard } from './components/ResultCard';
import { EmptyState } from './components/EmptyState';

const provider = new GooglePlacesProvider();

export const App: React.FC = () => {
  // Theme & i18n state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<Language>(loadSavedLanguage);
  const t = useMemo(() => translations[lang], [lang]);

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

  // Session Exclusion State
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

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Browser Geolocation Acquisition
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

  // Load places for current location (with 5-minute cache per cell key)
  const loadPlacesForLocation = async (
    loc: LocationCoordinates,
    radius: number
  ): Promise<{ places: Restaurant[]; cachedAt: number }> => {
    const cellKey = `google_${getLocationCellKey(loc, radius)}`;
    const cached = placesCache.current.get(cellKey);
    const FIVE_MINS = 5 * 60 * 1000;

    if (cached && Date.now() - cached.cachedAt < FIVE_MINS) {
      return cached;
    }

    const fetched = await provider.fetchPlaces(loc, radius);
    placesCache.current.set(cellKey, fetched);
    return fetched;
  };

  // Calculate current candidate count for live UI count badge
  const [candidateCount, setCandidateCount] = useState<number>(0);
  useEffect(() => {
    if (!location) return;
    loadPlacesForLocation(location, params.radius)
      .then(({ places }) => {
        const res = filterCandidates(places, location, params, provider.capabilities);
        setCandidateCount(res.candidateSet.length);
      })
      .catch((err) => {
        console.warn('Candidate count fetch error:', err);
      });
  }, [location, params]);

  // Spin Trigger Engine
  const handleSpin = async (extraRejectedId?: string) => {
    if (!location) {
      handleRequestGeolocation();
      return;
    }

    setIsSpinning(true);
    spinCancelRef.current = false;

    try {
      // Non-blocking roulette animation delay (600ms)
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (spinCancelRef.current) return;

      const { places, cachedAt } = await loadPlacesForLocation(location, params.radius);

      let currentSessionState = sessionState;
      if (extraRejectedId) {
        const newRejected = new Set(sessionState.rejectedIds);
        newRejected.add(extraRejectedId);
        currentSessionState = {
          ...sessionState,
          rejectedIds: newRejected,
        };
        setSessionState(currentSessionState);
      }

      const result = executeSpin(
        places,
        location,
        params,
        provider.capabilities,
        provider.id,
        provider.name,
        currentSessionState,
        cachedAt
      );

      if (spinCancelRef.current) return;

      setSpinResult(result);

      if (result.selected) {
        // Track last 10 suggestions
        const updatedLast = [
          result.selected.id,
          ...currentSessionState.lastSuggestions.filter((id) => id !== result.selected?.id),
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
      alert(`Google Maps Error: ${err.message || 'Failed to fetch places'}`);
    } finally {
      setIsSpinning(false);
    }
  };

  const handleCancelSpin = () => {
    spinCancelRef.current = true;
    setIsSpinning(false);
  };

  const handleRespin = (rejectedId: string) => {
    handleSpin(rejectedId);
  };

  return (
    <div className="app-container">
      <Header
        t={t}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeToggle={handleThemeToggle}
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
          capabilities={provider.capabilities}
          candidateCount={candidateCount}
        />

        <RouletteSpinner
          t={t}
          isSpinning={isSpinning}
          onSpin={() => handleSpin()}
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
              onRespin={handleRespin}
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
        Restaurant Roulette (zmittag) • Powered by Google Maps Places API • Swiss revDSG & EU GDPR Compliant
      </footer>
    </div>
  );
};
