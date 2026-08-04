import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { ExclusionReason } from '../domain/types';
import { TranslationSchema } from '../i18n/translations';

interface EmptyStateProps {
  t: TranslationSchema;
  explanation?: {
    mostCommonReason: ExclusionReason;
    count: number;
    recommendationEn: string;
    recommendationDe: string;
  };
  onResetFilters: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  t,
  explanation,
  onResetFilters,
}) => {
  return (
    <div className="card empty-state">
      <div className="empty-icon" role="img" aria-label="Searching">
        🔎
      </div>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{t.noResultsTitle}</h2>

      {explanation && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem',
            fontSize: '0.9rem',
            color: 'var(--accent-warning)',
            maxWidth: '480px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            <AlertCircle size={16} />
            <span>
              {explanation.count} place(s) excluded due to "{explanation.mostCommonReason}" filter
            </span>
          </div>
          <div>{explanation.recommendationEn}</div>
        </div>
      )}

      <button className="btn-primary" onClick={onResetFilters} style={{ marginTop: '0.5rem' }}>
        <RotateCcw size={18} />
        <span>{t.resetFilters}</span>
      </button>
    </div>
  );
};
