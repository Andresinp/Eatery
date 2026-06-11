import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Chip } from "./Chip";
export default function ListView({ listings, onSelect, }) {
    return (_jsx("div", { className: "absolute inset-0 z-10 bg-cream-50 overflow-y-auto animate-fade-in", children: _jsx("div", { className: "max-w-[760px] mx-auto px-4 pt-24 pb-32 space-y-3", children: listings.map((l) => {
                const isTable = l.listing_type === "table";
                return (_jsxs("button", { onClick: () => onSelect(l), className: "w-full text-left flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition", children: [_jsx("img", { src: l.photo, alt: l.title, className: "w-24 h-24 rounded-xl object-cover flex-none" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "chip " + (isTable ? "chip-amber" : "chip-leaf"), children: isTable ? "🍽 Table" : "🛍 Market" }), _jsxs("span", { className: "text-xs text-ink/60", children: ["\u2605 ", l.host_rating.toFixed(2)] })] }), _jsx("div", { className: "font-display font-bold text-lg leading-tight truncate", children: l.title }), _jsx("div", { className: "text-xs text-ink/60 mb-1.5", children: l.location_display }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [(isTable
                                            ? l.cuisine_tags
                                            : l.product_type_tags)
                                            .slice(0, 2)
                                            .map((t) => (_jsx(Chip, { children: t }, t))), l.dietary_tags.slice(0, 1).map((t) => (_jsx(Chip, { children: t }, t)))] })] }), _jsxs("div", { className: "flex-none text-right", children: [_jsxs("div", { className: "font-display font-extrabold text-xl leading-none", children: [l.currency, l.price_per_unit] }), _jsxs("div", { className: "text-[11px] text-ink/60 mt-1", children: ["per ", isTable ? "seat" : "unit"] })] })] }, l.id));
            }) }) }));
}
