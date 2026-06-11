import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function FAB({ onClick, label, children, active, }) {
    return (_jsx("button", { onClick: onClick, "aria-label": label, className: "w-12 h-12 rounded-full grid place-items-center border-2 transition shadow-float " +
            (active
                ? "bg-ink text-cream-50 border-ink"
                : "bg-cream-50 text-ink border-ink/90 hover:bg-amber/20"), children: children }));
}
export default function FloatingButtons({ onFilter, onToggleList, onLocate, listActive, }) {
    return (_jsxs("div", { className: "absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20", children: [_jsx(FAB, { onClick: onFilter, label: "Filter", children: _jsx(SlidersIcon, {}) }), _jsx(FAB, { onClick: onToggleList, label: "List view", active: listActive, children: _jsx(ListIcon, {}) }), _jsx(FAB, { onClick: onLocate, label: "Re-center map", children: _jsx(LocateIcon, {}) })] }));
}
function SlidersIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", children: [_jsx("line", { x1: "4", y1: "7", x2: "14", y2: "7" }), _jsx("line", { x1: "18", y1: "7", x2: "20", y2: "7" }), _jsx("circle", { cx: "16", cy: "7", r: "2.2" }), _jsx("line", { x1: "4", y1: "17", x2: "8", y2: "17" }), _jsx("line", { x1: "12", y1: "17", x2: "20", y2: "17" }), _jsx("circle", { cx: "10", cy: "17", r: "2.2" })] }));
}
function ListIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", children: [_jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }), _jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }), _jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })] }));
}
function LocateIcon() {
    return (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "3.2" }), _jsx("line", { x1: "12", y1: "2.5", x2: "12", y2: "5.5" }), _jsx("line", { x1: "12", y1: "18.5", x2: "12", y2: "21.5" }), _jsx("line", { x1: "2.5", y1: "12", x2: "5.5", y2: "12" }), _jsx("line", { x1: "18.5", y1: "12", x2: "21.5", y2: "12" })] }));
}
