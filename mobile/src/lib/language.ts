import { getLocales } from 'expo-localization';

import { i18n, SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';

import { logError } from './log';

export function isSupported(code: string): code is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

// The phone's language when we have it, else English.
export function deviceLanguage(): LanguageCode {
  for (const locale of getLocales()) {
    const code = locale.languageCode ?? '';
    if (isSupported(code)) return code;
  }
  return 'en';
}

export function setLanguage(code: string): void {
  const next = isSupported(code) ? code : deviceLanguage();
  if (i18n.language !== next) i18n.changeLanguage(next).catch((error: unknown) => logError('changeLanguage', error));
}
