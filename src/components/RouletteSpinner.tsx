import React, { useState, useEffect } from 'react';
import { Sparkles, Dices, XCircle } from 'lucide-react';
import { TranslationSchema } from '../i18n/translations';

interface RouletteSpinnerProps {
  t: TranslationSchema;
  isSpinning: boolean;
  onSpin: () => void;
  onCancel: () => void;
  ariaAnnouncement: string;
}

const FOOD_ICONS = ['🍕', '🍔', '🌮', '🍣', '🍜', '🥩', '🥗', '🍝', '🥙', '🍛', '🍱', 'Fries 🍟'];

export const RouletteSpinner: React.FC<RouletteSpinnerProps> = ({
  t,
  isSpinning,
  onSpin,
  onCancel,
  ariaAnnouncement,
}) => {
  const [activeIconIndex, setActiveIconIndex] = useState(0);

  useEffect(() => {
    let intervalId: any = null;
    if (isSpinning) {
      intervalId = setInterval(() => {
        setActiveIconIndex((prev) => (prev + 1) % FOOD_ICONS.length);
      }, 100);
    } else {
      setActiveIconIndex(0);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSpinning]);

  return (
    <div className="spin-section">
      {/* ARIA Live Region for Screen Readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      <div
        className={`wheel-container ${isSpinning ? 'spinning' : ''}`}
        aria-hidden="true"
        style={{
          transition: isSpinning ? 'transform 0.1s ease-in-out' : 'transform 0.4s ease',
        }}
      >
        <span>{isSpinning ? FOOD_ICONS[activeIconIndex] : '🍕'}</span>
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
          <button className="btn-primary spin-btn-lg" disabled style={{ background: 'var(--accent-gradient)', animation: 'pulse 1.5s infinite' }}>
            <Dices size={22} className="spin-icon" />
            <span>{t.spinning}</span>
          </button>

          {/* Cancellable spin */}
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
