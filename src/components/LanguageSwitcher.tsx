import { useEffect, useRef, useState } from "react";
import { SUPPORTED_LANGUAGES, useLanguage, useT } from "../i18n";

// Native-language label + flag for each supported language. Flags are emoji so
// they need no assets and render consistently across mobile platforms.
const FLAGS: Record<string, string> = {
  en: "🇬🇧",
  es: "🇪🇸",
  tr: "🇹🇷",
  it: "🇮🇹",
};

/**
 * Compact globe language switcher for the main UI (map screen). Tapping the
 * globe opens a small menu of supported languages; picking one updates the
 * profile language used by the whole i18n system.
 */
export default function LanguageSwitcher() {
  const { code, set } = useLanguage();
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // Close on click outside / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("settings.language")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-10 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center shadow-float"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.7 3.8 5.8 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.8-3.8-9s1.3-6.3 3.8-9z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-2xl bg-cream-50 border-2 border-ink/90 shadow-sheet overflow-hidden z-40"
        >
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = l.code === code;
            return (
              <button
                key={l.code}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  set(l.code);
                  setOpen(false);
                }}
                className={
                  "flex items-center gap-2.5 w-full text-left px-3.5 py-2.5 text-sm transition hover:bg-ink/5 " +
                  (active ? "font-bold bg-amber/15" : "font-medium")
                }
              >
                <span className="text-lg leading-none">{FLAGS[l.code] ?? "🌐"}</span>
                <span className="flex-1">{l.label}</span>
                {active && <span className="text-amber-deep">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
