import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
export default function PhotoCarousel({ photos, alt }) {
    const [i, setI] = useState(0);
    const safe = photos.length ? photos : [];
    return (_jsxs("div", { className: "relative w-full aspect-[4/3] sm:aspect-[16/10] bg-ink/5 overflow-hidden", children: [safe.map((src, idx) => (_jsx("img", { src: src, alt: alt, className: "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 " +
                    (idx === i ? "opacity-100" : "opacity-0") }, idx))), safe.length > 1 && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setI((i - 1 + safe.length) % safe.length), "aria-label": "Previous photo", className: "absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cream-50/95 border-2 border-ink grid place-items-center", children: "\u2039" }), _jsx("button", { onClick: () => setI((i + 1) % safe.length), "aria-label": "Next photo", className: "absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cream-50/95 border-2 border-ink grid place-items-center", children: "\u203A" }), _jsx("div", { className: "absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5", children: safe.map((_, idx) => (_jsx("span", { className: "h-1.5 rounded-full transition-all " +
                                (idx === i ? "w-6 bg-cream-50" : "w-1.5 bg-cream-50/60") }, idx))) })] }))] }));
}
