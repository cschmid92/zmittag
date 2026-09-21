import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
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

// Helper to reverse geocode lat/lng to actual city/neighborhood name
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const res = await geocoder.geocode({ location: { lat, lng } });
      if (res.results && res.results.length > 0) {
        const components = res.results[0].address_components || [];
        const locality = components.find((c: any) => c.types.includes('locality'))?.long_name;
        const sublocality = components.find(
          (c: any) => c.types.includes('sublocality') || c.types.includes('neighborhood')
        )?.long_name;

        if (sublocality && locality) {
          return `${sublocality}, ${locality}`;
        }
        if (locality) {
          return locality;
        }
        return res.results[0].formatted_address.split(',')[0];
      }
    } catch (e) {
      console.warn('Google reverse geocode error:', e);
    }
  }

  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await resp.json();
    if (data && data.address) {
      const city =
        data.address.city ||
        data.address.town ||
        data.address.village ||
        data.address.suburb ||
        data.address.county;
      if (city) return city;
    }
  } catch {}

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

export const App: React.FC = () => {
  // Theme & i18n state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<Language>(loadSavedLanguage);
  const t = useMemo(() => translations[lang], [lang]);

  // Location State (Default: null - requiring user geolocation or search)
  const [location, setLocation] = useState<LocationCoordinates | null>(null);
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

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

  // Browser Geolocation Acquisition with Reverse Geocoding
  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoError(t.locationDenied);
      return;
    }

    setIsLoadingGeo(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLoadingGeo(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        const displayName = await reverseGeocode(lat, lng);

        setLocation({
          lat,
          lng,
          accuracy,
          displayName,
        });
      },
      (err) => {
        setIsLoadingGeo(false);
        setGeoError(err.message || t.locationDenied);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  // Load places for current location (with 5-minute cache per cell key & filter hash)
  const loadPlacesForLocation = async (
    loc: LocationCoordinates,
    radius: number,
    searchParams?: SearchParams
  ): Promise<{ places: Restaurant[]; cachedAt: number }> => {
    const filterHash = searchParams
      ? `${searchParams.openNow}_${searchParams.priceLevels.join('-')}_${searchParams.cuisines.join('-')}`
      : 'all';
    const cellKey = `google_${getLocationCellKey(loc, radius)}_${filterHash}`;
    const cached = placesCache.current.get(cellKey);
    const FIVE_MINS = 5 * 60 * 1000;

    if (cached && Date.now() - cached.cachedAt < FIVE_MINS) {
      return cached;
    }

    const fetched = await provider.fetchPlaces(loc, radius, searchParams);
    placesCache.current.set(cellKey, fetched);
    return fetched;
  };

  // Calculate current candidate count for live UI count badge
  const [candidateCount, setCandidateCount] = useState<number>(0);
  useEffect(() => {
    if (!location) return;
    loadPlacesForLocation(location, params.radius, params)
      .then(({ places }) => {
        const res = filterCandidates(places, location, params, provider.capabilities);
        setCandidateCount(res.candidateSet.length);
        setApiError(null);
      })
      .catch((err: any) => {
        console.warn('Candidate count fetch error:', err);
        setApiError(err.message || 'Failed to connect to Google Maps API');
      });
  }, [location, params]);

  // Spin Trigger Engine (Runs API fetch & pagination concurrently with min 3.0s roulette spin)
  const handleSpin = async (extraRejectedId?: string) => {
    if (!location) {
      handleRequestGeolocation();
      return;
    }

    setIsSpinning(true);
    setApiError(null);
    spinCancelRef.current = false;

    try {
      // 1. Fetch places concurrently with 3.0-second roulette spin animation
      const fetchPromise = loadPlacesForLocation(location, params.radius, params);
      const minSpinAnimation = new Promise((resolve) => setTimeout(resolve, 3000));

      const [{ places, cachedAt }] = await Promise.all([fetchPromise, minSpinAnimation]);

      if (spinCancelRef.current) return;

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
      const msg = err.message || 'Failed to fetch places from Google Maps';
      setApiError(msg);
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

        {apiError && (
          <div
            className="card"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Google Maps Configuration Error</strong>
              {apiError}
            </div>
          </div>
        )}

        {/* Display Spin Result or Empty State */}
        {spinResult && location && !apiError && (
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
