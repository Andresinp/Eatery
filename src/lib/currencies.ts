import type { TKey } from "../i18n";

export interface CurrencyOption {
  value: string;    // Price prefix stored on the listing (e.g. "€", "$", "CHF")
  symbol: string;   // Glyph shown in the picker's symbol column
  code: string;     // ISO 4217 code shown in the picker's code column
  name: string;     // English name used for search matching
  regionKey: TKey;  // i18n key for the translated region/country label
}

export const CURRENCIES: CurrencyOption[] = [
  // Major global
  { value: "€",   symbol: "€",   code: "EUR", name: "Euro",               regionKey: "currency.eurozone" },
  { value: "$",   symbol: "$",   code: "USD", name: "US Dollar",          regionKey: "currency.unitedStates" },
  { value: "£",   symbol: "£",   code: "GBP", name: "Pound Sterling",     regionKey: "currency.unitedKingdom" },
  { value: "¥",   symbol: "¥",   code: "JPY", name: "Japanese Yen",       regionKey: "currency.japan" },
  { value: "₹",   symbol: "₹",   code: "INR", name: "Indian Rupee",       regionKey: "currency.india" },
  { value: "₩",   symbol: "₩",   code: "KRW", name: "South Korean Won",   regionKey: "currency.southKorea" },
  { value: "CN¥", symbol: "¥",   code: "CNY", name: "Chinese Yuan",       regionKey: "currency.china" },

  // Europe
  { value: "₺",   symbol: "₺",   code: "TRY", name: "Turkish Lira",       regionKey: "currency.turkey" },
  { value: "CHF", symbol: "Fr",  code: "CHF", name: "Swiss Franc",        regionKey: "currency.switzerland" },
  { value: "SEK", symbol: "kr",  code: "SEK", name: "Swedish Krona",      regionKey: "currency.sweden" },
  { value: "NOK", symbol: "kr",  code: "NOK", name: "Norwegian Krone",    regionKey: "currency.norway" },
  { value: "DKK", symbol: "kr",  code: "DKK", name: "Danish Krone",       regionKey: "currency.denmark" },
  { value: "PLN", symbol: "zł",  code: "PLN", name: "Polish Zloty",       regionKey: "currency.poland" },
  { value: "CZK", symbol: "Kč",  code: "CZK", name: "Czech Koruna",       regionKey: "currency.czechRepublic" },
  { value: "RON", symbol: "lei", code: "RON", name: "Romanian Leu",       regionKey: "currency.romania" },
  { value: "HUF", symbol: "Ft",  code: "HUF", name: "Hungarian Forint",   regionKey: "currency.hungary" },
  { value: "BGN", symbol: "лв",  code: "BGN", name: "Bulgarian Lev",      regionKey: "currency.bulgaria" },
  { value: "RSD", symbol: "din", code: "RSD", name: "Serbian Dinar",      regionKey: "currency.serbia" },
  { value: "BAM", symbol: "KM",  code: "BAM", name: "Bosnia Mark",        regionKey: "currency.bosnia" },
  { value: "MKD", symbol: "ден", code: "MKD", name: "Macedonian Denar",   regionKey: "currency.northMacedonia" },
  { value: "ALL", symbol: "L",   code: "ALL", name: "Albanian Lek",       regionKey: "currency.albania" },

  // Middle East & North Africa
  { value: "د.إ", symbol: "د.إ", code: "AED", name: "UAE Dirham",         regionKey: "currency.uae" },
  { value: "SAR", symbol: "﷼",   code: "SAR", name: "Saudi Riyal",        regionKey: "currency.saudiArabia" },
  { value: "QAR", symbol: "﷼",   code: "QAR", name: "Qatari Riyal",       regionKey: "currency.qatar" },
  { value: "KWD", symbol: "KD",  code: "KWD", name: "Kuwaiti Dinar",      regionKey: "currency.kuwait" },
  { value: "BHD", symbol: "BD",  code: "BHD", name: "Bahraini Dinar",     regionKey: "currency.bahrain" },
  { value: "OMR", symbol: "﷼",   code: "OMR", name: "Omani Rial",         regionKey: "currency.oman" },
  { value: "EGP", symbol: "E£",  code: "EGP", name: "Egyptian Pound",     regionKey: "currency.egypt" },
  { value: "MAD", symbol: "DH",  code: "MAD", name: "Moroccan Dirham",    regionKey: "currency.morocco" },
  { value: "TND", symbol: "DT",  code: "TND", name: "Tunisian Dinar",     regionKey: "currency.tunisia" },

  // Africa
  { value: "NGN", symbol: "₦",   code: "NGN", name: "Nigerian Naira",     regionKey: "currency.nigeria" },
  { value: "KES", symbol: "KSh", code: "KES", name: "Kenyan Shilling",    regionKey: "currency.kenya" },
  { value: "GHS", symbol: "GH₵", code: "GHS", name: "Ghanaian Cedi",      regionKey: "currency.ghana" },
  { value: "ZAR", symbol: "R",   code: "ZAR", name: "South African Rand", regionKey: "currency.southAfrica" },

  // Asia-Pacific
  { value: "THB", symbol: "฿",   code: "THB", name: "Thai Baht",          regionKey: "currency.thailand" },
  { value: "S$",  symbol: "S$",  code: "SGD", name: "Singapore Dollar",   regionKey: "currency.singapore" },
  { value: "HK$", symbol: "HK$", code: "HKD", name: "Hong Kong Dollar",   regionKey: "currency.hongKong" },
  { value: "MYR", symbol: "RM",  code: "MYR", name: "Malaysian Ringgit",  regionKey: "currency.malaysia" },
  { value: "IDR", symbol: "Rp",  code: "IDR", name: "Indonesian Rupiah",  regionKey: "currency.indonesia" },
  { value: "PKR", symbol: "Rs",  code: "PKR", name: "Pakistani Rupee",    regionKey: "currency.pakistan" },

  // Americas
  { value: "CA$", symbol: "CA$", code: "CAD", name: "Canadian Dollar",    regionKey: "currency.canada" },
  { value: "A$",  symbol: "A$",  code: "AUD", name: "Australian Dollar",  regionKey: "currency.australia" },
  { value: "NZ$", symbol: "NZ$", code: "NZD", name: "New Zealand Dollar", regionKey: "currency.newZealand" },
  { value: "R$",  symbol: "R$",  code: "BRL", name: "Brazilian Real",     regionKey: "currency.brazil" },
  { value: "MX$", symbol: "MX$", code: "MXN", name: "Mexican Peso",       regionKey: "currency.mexico" },
  { value: "ARS", symbol: "AR$", code: "ARS", name: "Argentine Peso",     regionKey: "currency.argentina" },
  { value: "CLP", symbol: "CL$", code: "CLP", name: "Chilean Peso",       regionKey: "currency.chile" },
  { value: "COP", symbol: "CO$", code: "COP", name: "Colombian Peso",     regionKey: "currency.colombia" },
  { value: "PEN", symbol: "S/",  code: "PEN", name: "Peruvian Sol",       regionKey: "currency.peru" },
];

export function currencyFor(value: string): CurrencyOption {
  return CURRENCIES.find((c) => c.value === value) ?? CURRENCIES[0];
}
