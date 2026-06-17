import { useProfile } from "../store/profile";
import en, { type Translations } from "./locales/en";
import es from "./locales/es";
import tr from "./locales/tr";
import it from "./locales/it";
import fr from "./locales/fr";
import de from "./locales/de";
import pt from "./locales/pt";
import ar from "./locales/ar";
import ru from "./locales/ru";
import zh from "./locales/zh";
import ja from "./locales/ja";
import sq from "./locales/sq";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "sq", label: "Shqip", flag: "🇦🇱" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const LOCALES: Record<LanguageCode, Translations> = {
  en, es, tr, it, fr, de, pt, ar, ru, zh, ja, sq,
};

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

export function detectDeviceLanguage(): LanguageCode {
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const lang of langs) {
      const primary = lang.split("-")[0].toLowerCase();
      if (isSupported(primary)) return primary as LanguageCode;
    }
  } catch {
    // navigator not available (SSR/test)
  }
  return "en";
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
  const meta = SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
  return {
    code,
    flag: meta.flag,
    label: meta.label,
    set: (next: LanguageCode) => update({ language: next }),
  };
}
