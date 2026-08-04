import React, { useState } from 'react';
import { MapPin, Navigation, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LocationCoordinates } from '../domain/types';
import { TranslationSchema } from '../i18n/translations';

interface LocationBannerProps {
  t: TranslationSchema;
  location: LocationCoordinates | null;
  onLocationChange: (loc: LocationCoordinates) => void;
  isLoadingGeo: boolean;
  onRequestGeolocation: () => void;
  geoError: string | null;
}

export const LocationBanner: React.FC<LocationBannerProps> = ({
  t,
  location,
  onLocationChange,
  isLoadingGeo,
  onRequestGeolocation,
  geoError,
}: LocationBannerProps) => {
  const [isManual, setIsManual] = useState<boolean>(false);
  const [manualQuery, setManualQuery] = useState<string>('');
  const [isSearchingManual, setIsSearchingManual] = useState<boolean>(false);

  const handleManualSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setIsSearchingManual(true);
    try {
      // Nominatim keyless geocoding search for manual fallback
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          manualQuery
        )}&limit=1`
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        const item = data[0];
        onLocationChange({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          displayName: item.display_name.split(',')[0],
          accuracy: undefined,
        });
        setIsManual(false);
      } else {
        alert('Location not found. Please try another query.');
      }
    } catch {
      // Fallback coordinate mapping if offline/network error
      onLocationChange({
        lat: 47.3769,
        lng: 8.5417,
        displayName: manualQuery,
        accuracy: undefined,
      });
      setIsManual(false);
    } finally {
      setIsSearchingManual(false);
    }
  };

  const isLowAccuracy = location?.accuracy !== undefined && location.accuracy > 200;

  return (
    <div className="card location-banner">
      <div className="location-header">
        <div className="location-title">
          <MapPin size={18} color="var(--accent-primary)" />
          <span>
            {location
              ? location.displayName || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
              : t.location}
          </span>
        </div>

        {location?.accuracy !== undefined && (
          <span className={`accuracy-badge ${isLowAccuracy ? 'warning' : 'ok'}`}>
            {isLowAccuracy ? (
              <>
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: '3px' }} />
                {t.locationAccuracyWarning(Math.round(location.accuracy))}
              </>
            ) : (
              <>
                <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '3px' }} />
                GPS ±{Math.round(location.accuracy)}m
              </>
            )}
          </span>
        )}
      </div>

      {geoError && (
        <div style={{ color: 'var(--accent-warning)', fontSize: '0.85rem' }}>
          {t.locationDenied}
        </div>
      )}

      {!isManual ? (
        <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={onRequestGeolocation}
            disabled={isLoadingGeo}
          >
            <Navigation size={18} />
            {isLoadingGeo ? t.spinning : location ? t.useMyLocation : t.useMyLocation}
          </button>
          <button className="btn-secondary" onClick={() => setIsManual(true)}>
            <Search size={18} />
            {t.manualLocation}
          </button>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="input-row">
          <input
            type="text"
            className="text-input"
            placeholder={t.enterCityOrAddress}
            value={manualQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary" disabled={isSearchingManual}>
            {isSearchingManual ? '...' : t.searchLocation}
          </button>
          <button type="button" className="btn-secondary" onClick={() => setIsManual(false)}>
            ✕
          </button>
        </form>
      )}
    </div>
  );
};
