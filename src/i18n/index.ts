import { useProfile } from "../store/profile";
import en, { type Translations } from "./locales/en";
import es from "./locales/es";
import tr from "./locales/tr";
import it from "./locales/it";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "tr", label: "Türkçe" },
  { code: "it", label: "Italiano" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const LOCALES: Record<LanguageCode, Translations> = { en, es, tr, it };

type DotPaths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends object
    ? DotPaths<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[keyof T & string];

export type TKey = DotPaths<Translations>;

function resolve(dict: Translations, key: string): string {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof cur === "string" ? cur : key;
}

function isSupported(code: string): code is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly { code: string }[]).some((l) => l.code === code);
}

export function useT() {
  const lang = useProfile((s) => s.me.language);
  const code: LanguageCode = isSupported(lang) ? lang : "en";
  const dict = LOCALES[code];
  return (key: TKey, fallback?: string): string => {
    const value = resolve(dict, key);
    if (value === key && code !== "en") {
      const fromEn = resolve(en, key);
      if (fromEn !== key) return fromEn;
    }
    return value !== key ? value : (fallback ?? key);
  };
}

export function useLanguage() {
  const lang = useProfile((s) => s.me.language);
  const update = useProfile((s) => s.update);
  const code: LanguageCode = isSupported(lang) ? lang : "en";
  return {
    code,
    set: (next: LanguageCode) => update({ language: next }),
  };
}
