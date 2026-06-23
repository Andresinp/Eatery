import type { ReactNode } from "react";

type Variant = "default" | "amber" | "leaf";

export function Chip({
  children,
  variant = "default",
  active = false,
  onClick,
  count,
}: {
  children: ReactNode;
  variant?: Variant;
  active?: boolean;
  onClick?: () => void;
  count?: number;
}) {
  const cls = active
    ? "chip chip-active"
    : variant === "amber"
    ? "chip chip-amber"
    : variant === "leaf"
    ? "chip chip-leaf"
    : "chip";

  const badge = count !== undefined ? (
    <span className={`text-[10px] font-normal ${active ? "opacity-60" : "opacity-40"}`}>
      {count}
    </span>
  ) : null;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {children}
        {badge}
      </button>
    );
  }

  return (
    <span className={cls}>
      {children}
      {badge}
    </span>
  );
}
