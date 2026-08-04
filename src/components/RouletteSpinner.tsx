import React from 'react';
import { Sparkles, Dices, XCircle } from 'lucide-react';
import { TranslationSchema } from '../i18n/translations';

interface RouletteSpinnerProps {
  t: TranslationSchema;
  isSpinning: boolean;
  onSpin: () => void;
  onCancel: () => void;
  ariaAnnouncement: string;
}

export const RouletteSpinner: React.FC<RouletteSpinnerProps> = ({
  t,
  isSpinning,
  onSpin,
  onCancel,
  ariaAnnouncement,
}) => {
  return (
    <div className="spin-section">
      {/* ARIA Live Region for Screen Readers (NFR2) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      <div
        className={`wheel-container ${isSpinning ? 'spinning' : ''}`}
        aria-hidden="true"
      >
        <span>🍕</span>
      </div>

      {!isSpinning ? (
        <button
          className="btn-primary spin-btn-lg"
          onClick={onSpin}
          aria-label={t.spinButton}
        >
          <Sparkles size={22} />
          <span>{t.spinButton}</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
          <button className="btn-primary spin-btn-lg" disabled>
            <Dices size={22} className="spin-icon" />
            <span>{t.spinning}</span>
          </button>

          {/* Cancellable spin (FR4) */}
          <button
            className="btn-secondary"
            style={{ fontSize: '0.85rem', color: 'var(--accent-warning)' }}
            onClick={onCancel}
          >
            <XCircle size={16} />
            <span>Cancel Spin</span>
          </button>
        </div>
      )}
    </div>
  );
};
