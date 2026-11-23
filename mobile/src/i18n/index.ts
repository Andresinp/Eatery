import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { resources } from './resources';

// Flat dotted keys ("booking.payNow"), one JSON per area per language under locales/<lang>/.
// English is the reference: scripts/i18n-check.mjs fails the build when a literal translation key has no
// English entry, when a language is missing a key English has, or when copy names a platform.
// keySeparator: false makes "booking.payNow" one key rather than a path.

export const SUPPORTED_LANGUAGES = ['en', 'es', 'tr', 'fr', 'de', 'it', 'pt', 'ar', 'ru', 'zh', 'ja', 'sq'] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

// Shown in the language picker in their own language.
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: 'English',
  es: 'Español',
  tr: 'Türkçe',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ar: 'العربية',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  sq: 'Shqip',
};

const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
