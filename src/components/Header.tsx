import React from 'react';
import { Globe, Moon, Sun } from 'lucide-react';
import { Language, TranslationSchema } from '../i18n/translations';

interface HeaderProps {
  t: TranslationSchema;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  t,
  lang,
  onLanguageChange,
  theme,
  onThemeToggle,
}) => {
  return (
    <header className="app-header">
      <a href="#" className="brand" aria-label="Restaurant Roulette Home">
        <span className="brand-icon" role="img" aria-label="Pizza">🍕</span>
        <div>
          <h1 className="brand-title">{t.appTitle}</h1>
        </div>
      </a>

      <div className="header-actions">
        {/* Language Switcher */}
        <button
          className="icon-btn"
          onClick={() => onLanguageChange(lang === 'en' ? 'de' : 'en')}
          title="Switch Language (English / Deutsch)"
          aria-label="Switch Language"
        >
          <Globe size={18} />
          <span style={{ fontSize: '0.75rem', marginLeft: '4px', textTransform: 'uppercase' }}>
            {lang}
          </span>
        </button>

        {/* Theme Switcher */}
        <button
          className="icon-btn"
          onClick={onThemeToggle}
          title="Toggle Light / Dark Mode"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
