import type { ReactNode } from "react";

type Variant = "default" | "amber" | "leaf";

export function Chip({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: Variant;
}) {
  const cls =
    variant === "amber" ? "chip chip-amber" : variant === "leaf" ? "chip chip-leaf" : "chip";
  return <span className={cls}>{children}</span>;
}
