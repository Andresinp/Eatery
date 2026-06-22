import type { ReactNode } from "react";
import { useT } from "../i18n";

function FAB({
  onClick,
  label,
  children,
  active,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={
        "w-11 h-11 rounded-full grid place-items-center border transition shadow-pill " +
        (active
          ? "bg-ink text-cream-50 border-ink"
          : "bg-cream-50 text-ink border-ink/40 hover:bg-amber/20")
      }
    >
      {children}
    </button>
  );
}

export default function FloatingButtons({
  onFilter,
  onToggleList,
  onLocate,
  listActive,
}: {
  onFilter: () => void;
  onToggleList: () => void;
  onLocate: () => void;
  listActive: boolean;
}) {
  const t = useT();
  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
      <FAB onClick={onFilter} label={t("fab.filter")}>
        <SlidersIcon />
      </FAB>
      <FAB onClick={onToggleList} label={t("fab.listView")} active={listActive}>
        <ListIcon />
      </FAB>
      <FAB onClick={onLocate} label={t("fab.recenter")}>
        <LocateIcon />
      </FAB>
    </div>
  );
}

function SlidersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="7" x2="14" y2="7" />
      <line x1="18" y1="7" x2="20" y2="7" />
      <circle cx="16" cy="7" r="2.2" />
      <line x1="4" y1="17" x2="8" y2="17" />
      <line x1="12" y1="17" x2="20" y2="17" />
      <circle cx="10" cy="17" r="2.2" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3.2" />
      <line x1="12" y1="2.5" x2="12" y2="5.5" />
      <line x1="12" y1="18.5" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5.5" y2="12" />
      <line x1="18.5" y1="12" x2="21.5" y2="12" />
    </svg>
  );
}
