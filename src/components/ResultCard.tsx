import React, { useState } from 'react';
import { Star, MapPin, Footprints, ExternalLink, Share2, Dices, ShieldCheck } from 'lucide-react';
import { LocationCoordinates, RelaxationStep, Restaurant } from '../domain/types';
import { calculateDistanceMeters, estimateWalkingTimeMinutes, formatDistance } from '../domain/geoUtils';
import { TranslationSchema } from '../i18n/translations';

interface ResultCardProps {
  t: TranslationSchema;
  restaurant: Restaurant;
  userLocation: LocationCoordinates;
  providerName: string;
  cachedAt: number;
  appliedRelaxations: RelaxationStep[];
  onRespin: (rejectedId: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  t,
  restaurant,
  userLocation,
  providerName,
  cachedAt,
  appliedRelaxations,
  onRespin,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const distanceMeters = calculateDistanceMeters(userLocation, restaurant);
  const walkingMins = estimateWalkingTimeMinutes(distanceMeters);
  const distFormatted = formatDistance(distanceMeters);
  const cacheAgeMins = Math.round((Date.now() - cachedAt) / 60000);

  const handleShare = async () => {
    const shareText = `🍕 ${t.appTitle} Pick: ${restaurant.name}\n` +
      `${restaurant.rating ? `★ ${restaurant.rating.toFixed(1)} (${restaurant.reviewCount || 0} reviews)` : 'Unrated'}\n` +
      `📍 ${restaurant.address} (${distFormatted}, ${t.walkingTime(walkingMins)})\n` +
      `🔗 ${restaurant.mapUrl || ''}`;

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="card result-card">
      <div className="result-header">
        <div>
          <h2 className="restaurant-name">{restaurant.name}</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            {restaurant.cuisine || 'Restaurant'} • {restaurant.address}
          </div>
        </div>

        {/* Rating and review count MUST be shown together */}
        {restaurant.rating !== undefined ? (
          <div className="rating-badge" title="Rating and review count">
            <Star size={16} fill="var(--accent-primary)" />
            <span>{restaurant.rating.toFixed(1)}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              ({restaurant.reviewCount ?? 0})
            </span>
          </div>
        ) : (
          <div className="rating-badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
            <span>Unrated</span>
          </div>
        )}
      </div>

      {/* Meta Information: Distance, Walking Time, Price Level, Open State */}
      <div className="meta-row">
        <div className="meta-item">
          <MapPin size={16} color="var(--accent-primary)" />
          <span>{distFormatted}</span>
        </div>
        <div className="meta-item">
          <Footprints size={16} color="var(--accent-primary)" />
          <span>{t.walkingTime(walkingMins)}</span>
        </div>
        {restaurant.priceLevel && (
          <div className="meta-item" style={{ fontWeight: 700, color: 'var(--accent-success)' }}>
            {'$'.repeat(restaurant.priceLevel)}
          </div>
        )}
        {restaurant.openNow !== undefined && (
          <div className="meta-item" style={{ color: restaurant.openNow ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
            • {restaurant.openNow ? t.openNow : 'Closed'}
          </div>
        )}
      </div>

      {/* Applied Relaxation Notices */}
      {appliedRelaxations.length > 0 && (
        <div className="relaxation-notice">
          <strong>{t.appliedRelaxationNotice}</strong>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.3rem' }}>
            {appliedRelaxations.map((step, idx) => (
              <li key={idx}>
                {step.messageEn}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions: Map Link, Respin, Share */}
      <div className="result-actions">
        {restaurant.mapUrl && (
          <a
            href={restaurant.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary map-btn"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={18} />
            <span>{t.openInMaps}</span>
          </a>
        )}

        <div className="action-row">
          <button
            className="btn-secondary"
            onClick={() => onRespin(restaurant.id)}
          >
            <Dices size={16} />
            <span>{t.respin}</span>
          </button>
          <button className="btn-secondary" onClick={handleShare}>
            <Share2 size={16} />
            <span>{isCopied ? t.copiedShareText : t.copyShareText}</span>
          </button>
        </div>
      </div>

      {/* Data Source & Cache Age Footer */}
      <div className="data-origin-footer">
        <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
        {t.dataSource}: {providerName} • {t.cachedAge(cacheAgeMins)}
      </div>
    </div>
  );
};
