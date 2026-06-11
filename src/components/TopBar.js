import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
export default function TopBar({ back, title, transparent, }) {
    const nav = useNavigate();
    return (_jsxs("header", { className: "sticky top-0 z-30 px-4 py-3 flex items-center justify-between " +
            (transparent ? "bg-transparent" : "bg-cream-50/95 backdrop-blur border-b border-ink/10"), children: [_jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [back ? (_jsx("button", { onClick: () => nav(-1), "aria-label": "Back", className: "w-10 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center shadow-float flex-none", children: "\u2039" })) : (_jsx(Link, { to: "/", className: "flex-none", children: _jsx(Logo, {}) })), title && (_jsx("div", { className: "font-display font-extrabold text-lg truncate", children: title }))] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Link, { to: "/orders", className: "px-3 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center text-sm font-semibold shadow-float", children: "Orders" }), _jsx("button", { className: "w-10 h-10 rounded-full overflow-hidden border-2 border-ink shadow-float flex-none", children: _jsx("img", { src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&q=80", alt: "Profile", className: "w-full h-full object-cover" }) })] })] }));
}
