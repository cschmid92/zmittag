import { DEFAULT_SEARCH_PARAMS, SearchParams } from '../domain/types';
import { Language } from '../i18n/translations';

const PARAMS_KEY = 'zmittag_search_params';
const LANG_KEY = 'zmittag_language';

export function loadSavedParams(): SearchParams {
  try {
    const raw = localStorage.getItem(PARAMS_KEY);
    if (!raw) return DEFAULT_SEARCH_PARAMS;
    const parsed = JSON.parse(raw);
    return {
      radius: typeof parsed.radius === 'number' ? parsed.radius : DEFAULT_SEARCH_PARAMS.radius,
      minRating: typeof parsed.minRating === 'number' ? parsed.minRating : DEFAULT_SEARCH_PARAMS.minRating,
      minReviews: typeof parsed.minReviews === 'number' ? parsed.minReviews : DEFAULT_SEARCH_PARAMS.minReviews,
      priceLevels: Array.isArray(parsed.priceLevels) ? parsed.priceLevels : DEFAULT_SEARCH_PARAMS.priceLevels,
      openNow: typeof parsed.openNow === 'boolean' ? parsed.openNow : DEFAULT_SEARCH_PARAMS.openNow,
      cuisines: Array.isArray(parsed.cuisines) ? parsed.cuisines : DEFAULT_SEARCH_PARAMS.cuisines,
      favourHigherRated: typeof parsed.favourHigherRated === 'boolean' ? parsed.favourHigherRated : DEFAULT_SEARCH_PARAMS.favourHigherRated,
    };
  } catch {
    return DEFAULT_SEARCH_PARAMS;
  }
}

export function saveParams(params: SearchParams): void {
  try {
    localStorage.setItem(PARAMS_KEY, JSON.stringify(params));
  } catch (e) {
    console.error('Failed to save search params to localStorage:', e);
  }
}

export function loadSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_KEY) as Language;
    if (saved === 'en' || saved === 'de') return saved;
    // Derive from browser language
    const navLang = navigator.language.toLowerCase();
    return navLang.startsWith('de') ? 'de' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguage(lang: Language): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    console.error('Failed to save language to localStorage:', e);
  }
}
