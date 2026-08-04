import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { DEFAULT_SEARCH_PARAMS, SearchParams } from '../domain/types';
import { ProviderCapabilities } from '../domain/providers/types';
import { TranslationSchema } from '../i18n/translations';

interface FilterPanelProps {
  t: TranslationSchema;
  params: SearchParams;
  onChange: (updated: SearchParams) => void;
  capabilities: ProviderCapabilities;
  candidateCount: number;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  t,
  params,
  onChange,
  capabilities,
  candidateCount,
}: FilterPanelProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const togglePriceLevel = (level: number): void => {
    let current: number[] = [...params.priceLevels];
    if (current.includes(level)) {
      if (current.length > 1) {
        current = current.filter((l: number) => l !== level);
      }
    } else {
      current.push(level);
      current.sort((a: number, b: number) => a - b);
    }
    onChange({ ...params, priceLevels: current });
  };

  const resetToDefault = (): void => {
    onChange(DEFAULT_SEARCH_PARAMS);
  };

  return (
    <div className="card">
      <button
        className="filter-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="filter-controls-section"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SlidersHorizontal size={18} color="var(--accent-primary)" />
          <span>{t.filters}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            ({t.candidateCount(candidateCount)})
          </span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div id="filter-controls-section" className="filter-grid">
          {/* Radius Slider */}
          <div className="filter-group">
            <div className="filter-label">
              <span>{t.radius}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                {params.radius >= 1000 ? `${(params.radius / 1000).toFixed(1)} km` : `${params.radius} m`}
              </span>
            </div>
            <input
              type="range"
              min={250}
              max={10000}
              step={250}
              className="range-slider"
              value={params.radius}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ ...params, radius: parseInt(e.target.value, 10) })
              }
            />
          </div>

          {/* Grouped Rating & Review Count Controls (FR2.2) */}
          <div
            className="filter-group"
            style={{
              opacity: capabilities.hasRating || capabilities.hasReviewCount ? 1 : 0.45,
            }}
          >
            <div className="filter-label">
              <span>{t.minRating} & {t.minReviews}</span>
              {(!capabilities.hasRating || !capabilities.hasReviewCount) && (
                <span className="unsupported-tag">{t.unsupportedByProvider}</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ★ {params.minRating.toFixed(1)}
                </span>
                <input
                  type="range"
                  min={0.0}
                  max={5.0}
                  step={0.1}
                  className="range-slider"
                  disabled={!capabilities.hasRating}
                  value={params.minRating}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({ ...params, minRating: parseFloat(e.target.value) })
                  }
                />
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {params.minReviews} {t.minReviews.toLowerCase()}
                </span>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  className="range-slider"
                  disabled={!capabilities.hasReviewCount}
                  value={params.minReviews}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    onChange({ ...params, minReviews: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>
          </div>

          {/* Price Level Tiers */}
          <div
            className="filter-group"
            style={{ opacity: capabilities.hasPriceLevel ? 1 : 0.45 }}
          >
            <div className="filter-label">
              <span>{t.priceLevel}</span>
              {!capabilities.hasPriceLevel && (
                <span className="unsupported-tag">{t.unsupportedByProvider}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.25rem' }}>
              {[1, 2, 3, 4].map((tier: number) => {
                const isSelected = params.priceLevels.includes(tier);
                return (
                  <button
                    key={tier}
                    type="button"
                    disabled={!capabilities.hasPriceLevel}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      minHeight: '38px',
                      padding: 0,
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--card-border)',
                      background: isSelected ? 'rgba(249, 115, 22, 0.2)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 700 : 500,
                    }}
                    onClick={() => togglePriceLevel(tier)}
                  >
                    {'$'.repeat(tier)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuisine Selector */}
          <div
            className="filter-group"
            style={{ opacity: capabilities.hasCuisines ? 1 : 0.45 }}
          >
            <div className="filter-label">
              <span>{t.cuisine}</span>
              {!capabilities.hasCuisines && (
                <span className="unsupported-tag">{t.unsupportedByProvider}</span>
              )}
            </div>
            <select
              className="text-input"
              disabled={!capabilities.hasCuisines}
              value={params.cuisines[0] || ''}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                onChange({
                  ...params,
                  cuisines: e.target.value ? [e.target.value] : [],
                })
              }
            >
              <option value="">{t.allCuisines}</option>
              {(capabilities.supportedCuisines || [
                'Italian',
                'Swiss',
                'Japanese',
                'Vegetarian',
                'Burger',
                'Indian',
                'Mexican',
                'French',
                'Asian',
              ]).map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Open Now Toggle */}
          <div
            className="toggle-row"
            style={{ opacity: capabilities.hasOpenNow ? 1 : 0.45 }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.openNow}</div>
              {!capabilities.hasOpenNow && (
                <span className="unsupported-tag">{t.unsupportedByProvider}</span>
              )}
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                disabled={!capabilities.hasOpenNow}
                checked={params.openNow}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ ...params, openNow: e.target.checked })
                }
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Favour Higher Rated Toggle */}
          <div
            className="toggle-row"
            style={{ opacity: capabilities.hasRating ? 1 : 0.45 }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.favourHigherRated}</div>
              {!capabilities.hasRating && (
                <span className="unsupported-tag">{t.unsupportedByProvider}</span>
              )}
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                disabled={!capabilities.hasRating}
                checked={params.favourHigherRated}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ ...params, favourHigherRated: e.target.checked })
                }
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Reset Filters */}
          <div style={{ gridColumn: '1 / -1', paddingTop: '0.5rem' }}>
            <button
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={resetToDefault}
            >
              <RotateCcw size={16} />
              {t.resetFilters}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
