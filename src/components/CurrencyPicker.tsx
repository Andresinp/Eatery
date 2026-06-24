import { useEffect, useRef, useState } from "react";
import { CURRENCIES, currencyFor } from "../lib/currencies";
import { useT } from "../i18n";

export default function CurrencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useT();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = currencyFor(value);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={t("currency.select")}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-ink/20 bg-white text-sm font-semibold focus:outline-none focus:border-ink hover:border-ink/40 transition-colors min-w-0"
      >
        <span className="text-base leading-none">{current.symbol}</span>
        <span>{current.code}</span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink/40 flex-none"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <CurrencyDialog dialogRef={dialogRef} value={value} onChange={onChange} />
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
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const obs = new MutationObserver(() => {
      if (!dlg.open) return;
      setQuery("");
      requestAnimationFrame(() => {
        searchRef.current?.focus();
        const el = listRef.current?.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`);
        el?.scrollIntoView({ block: "nearest" });
      });
    });
    obs.observe(dlg, { attributes: true, attributeFilter: ["open"] });
    return () => obs.disconnect();
  }, [dialogRef, value]);

  const filtered = query.trim()
    ? CURRENCIES.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.code.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q)
        );
      })
    : CURRENCIES;

  const pick = (next: string) => {
    onChange(next);
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      className="currency-dialog"
    >
      <div className="w-full max-w-[420px] mx-auto rounded-t-2xl sm:rounded-2xl bg-white overflow-hidden shadow-sheet">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
          <h2 className="font-display font-bold text-sm">{t("currency.select")}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("common.close")}
            className="w-6 h-6 rounded-full bg-ink/5 grid place-items-center text-ink/50 hover:bg-ink/10 hover:text-ink transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-ink/10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-ink/5">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-ink/40 flex-none"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("currency.search")}
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-ink/40 hover:text-ink/60 flex-none"
                aria-label="Clear search"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div ref={listRef} className="currency-wheel">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink/40">{t("currency.noResults")}</p>
          ) : (
            filtered.map((c) => {
              const active = c.value === value;
              return (
                <button
                  key={c.code}
                  type="button"
                  data-value={c.value}
                  onClick={() => pick(c.value)}
                  className={"currency-row" + (active ? " is-active" : "")}
                >
                  <span className="currency-symbol">{c.symbol}</span>
                  <span className="w-11 flex-none text-sm font-semibold">{c.code}</span>
                  <span className="flex-1 text-xs text-ink/50 truncate">{t(c.regionKey)}</span>
                  {active && (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="flex-none text-amber-deep ml-1"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </dialog>
  );
}
