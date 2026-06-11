import { jsx as _jsx } from "react/jsx-runtime";
export function Chip({ children, variant = "default", }) {
    const cls = variant === "amber" ? "chip chip-amber" : variant === "leaf" ? "chip chip-leaf" : "chip";
    return _jsx("span", { className: cls, children: children });
}
