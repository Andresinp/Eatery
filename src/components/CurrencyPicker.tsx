import { useEffect, useRef } from "react";
import { CURRENCIES, currencyFor } from "../lib/currencies";
import { useT } from "../i18n";

/**
 * Native-feeling currency picker.
 *
 * The trigger shows the selected currency; tapping it opens a bottom sheet with
 * a scroll-snapping list that behaves like an iOS wheel picker. Each row shows
 * the symbol, the ISO code and the country/region — all translation-ready.
 */
export default function CurrencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useT();
  const open = useRef<HTMLDialogElement>(null);
  const current = currencyFor(value);

  return (
    <>
      <button
        type="button"
        onClick={() => open.current?.showModal()}
        aria-label={t("currency.select")}
        aria-haspopup="dialog"
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-ink/20 bg-white font-semibold focus:outline-none focus:border-ink min-w-0"
      >
        <span className="text-lg leading-none">{current.symbol}</span>
        <span className="text-sm">{current.code}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink/50 flex-none">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <CurrencyDialog dialogRef={open} value={value} onChange={onChange} />
    </>
  );
}

function CurrencyDialog({
  dialogRef,
  value,
  onChange,
}: {
  dialogRef: React.RefObject<HTMLDialogElement>;
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useT();
  const listRef = useRef<HTMLDivElement | null>(null);

  // Centre the current selection in the wheel when the sheet opens.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onOpen = () => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
      el?.scrollIntoView({ block: "center" });
    };
    // `showModal` doesn't fire a dedicated event, so observe the open attribute.
    const obs = new MutationObserver(() => {
      if (dlg.open) onOpen();
    });
    obs.observe(dlg, { attributes: true, attributeFilter: ["open"] });
    return () => obs.disconnect();
  }, [dialogRef, value]);

  const pick = (next: string) => {
    onChange(next);
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        // Click outside the panel (on the backdrop) closes.
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="currency-dialog"
    >
      <div className="w-full max-w-[480px] mx-auto rounded-t-3xl sm:rounded-3xl bg-cream-50 border-2 border-ink/90 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
          <h2 className="font-display font-extrabold text-lg">{t("currency.select")}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("common.close")}
            className="w-8 h-8 rounded-full bg-cream-50 border-2 border-ink/90 grid place-items-center"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div ref={listRef} className="currency-wheel">
          {CURRENCIES.map((c) => {
            const active = c.value === value;
            return (
              <button
                key={c.code}
                type="button"
                data-value={c.value}
                onClick={() => pick(c.value)}
                className={
                  "currency-row " + (active ? "is-active" : "")
                }
              >
                <span className="w-10 text-2xl leading-none text-center flex-none">{c.symbol}</span>
                <span className="font-bold w-14 flex-none">{c.code}</span>
                <span className="text-ink/60 text-sm truncate">{t(c.regionKey)}</span>
                {active && (
                  <span className="ml-auto text-amber-deep font-bold flex-none">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </dialog>
  );
}
