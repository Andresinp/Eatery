import { getLocales } from 'expo-localization';

import { CURRENCIES } from './currencies';

// The device region's currency as a listing price prefix ("₺", "CHF"), else the euro.
export function defaultCurrency(): string {
  const code = getLocales()[0].currencyCode;
  return CURRENCIES.find((c) => c.code === code)?.value ?? '€';
}
