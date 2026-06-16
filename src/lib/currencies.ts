import type { TKey } from "../i18n";

// The currency catalogue used by the "Post a listing" flow.
//
// `value` is what we persist on the listing (kept as the symbol/code that the
// rest of the app already renders in front of prices). `regionKey` points at an
// i18n string so the country/region label is translated like everything else.
export interface CurrencyOption {
  value: string;
  symbol: string;
  code: string;
  regionKey: TKey;
}

export const CURRENCIES: CurrencyOption[] = [
  { value: "€", symbol: "€", code: "EUR", regionKey: "currency.eurozone" },
  { value: "$", symbol: "$", code: "USD", regionKey: "currency.unitedStates" },
  { value: "£", symbol: "£", code: "GBP", regionKey: "currency.unitedKingdom" },
  { value: "₺", symbol: "₺", code: "TRY", regionKey: "currency.turkey" },
  { value: "د.إ", symbol: "د.إ", code: "AED", regionKey: "currency.uae" },
  { value: "MAD", symbol: "MAD", code: "MAD", regionKey: "currency.morocco" },
];

export function currencyFor(value: string): CurrencyOption {
  return CURRENCIES.find((c) => c.value === value) ?? CURRENCIES[0];
}
