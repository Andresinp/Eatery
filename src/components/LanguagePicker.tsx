import { useEffect } from "react";
import { SUPPORTED_LANGUAGES, useLanguage, type LanguageCode } from "../i18n";

interface Props {
  onClose: () => void;
}

export default function LanguagePicker({ onClose }: Props) {
  const { code, set } = useLanguage();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const select = (lang: LanguageCode) => {
    set(lang);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-ink/40 z-40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-label="Select language"
        className="fixed bottom-0 left-0 right-0 z-50 bg-cream-50 rounded-t-3xl border-t-2 border-ink/10 shadow-float flex flex-col"
        style={{ maxHeight: "72vh" }}
      >
        <div className="flex-none pt-3 pb-1 flex flex-col items-center gap-3">
          <div className="w-10 h-1 rounded-full bg-ink/20" />
          <div className="w-full px-5 pb-2 flex items-center justify-between border-b border-ink/10">
            <span className="font-display font-extrabold text-xl">🌐 Language</span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border-2 border-ink/20 grid place-items-center text-lg leading-none hover:border-ink transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-3 pb-6 pt-1">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang.code === code;
            return (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                className={
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-1 transition-colors text-left " +
                  (active
                    ? "bg-ink text-cream-50"
                    : "hover:bg-ink/5 active:bg-ink/10")
                }
              >
                <span className="text-2xl leading-none">{lang.flag}</span>
                <span className="flex-1 font-semibold text-base">{lang.label}</span>
                {active && (
                  <span className="text-cream-50 font-bold text-lg leading-none">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
