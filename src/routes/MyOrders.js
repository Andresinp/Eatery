import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useOrders } from "../store/orders";
export default function MyOrders() {
    const orders = useOrders((s) => s.orders);
    const [tab, setTab] = useState("upcoming");
    const { upcoming, past } = useMemo(() => {
        const up = [];
        const pa = [];
        for (const o of orders) {
            if (o.status === "confirmed")
                up.push(o);
            else
                pa.push(o);
        }
        return { upcoming: up, past: pa };
    }, [orders]);
    const list = tab === "upcoming" ? upcoming : past;
    return (_jsxs("div", { className: "min-h-full bg-cream-50", children: [_jsx(TopBar, { title: "My orders" }), _jsxs("div", { className: "max-w-[760px] mx-auto px-4 pt-2 pb-10", children: [_jsxs("div", { className: "flex items-center gap-1 p-1 rounded-full bg-white border-2 border-ink w-fit mx-auto shadow-float mb-6", children: [_jsxs(Tab, { active: tab === "upcoming", onClick: () => setTab("upcoming"), children: ["Upcoming ", upcoming.length > 0 && `· ${upcoming.length}`] }), _jsxs(Tab, { active: tab === "past", onClick: () => setTab("past"), children: ["Past ", past.length > 0 && `· ${past.length}`] })] }), list.length === 0 ? (_jsx(Empty, { tab: tab })) : (_jsx("div", { className: "space-y-3", children: list.map((o) => (_jsx(OrderCard, { order: o }, o.id))) }))] })] }));
}
function Tab({ active, children, onClick, }) {
    return (_jsx("button", { onClick: onClick, className: "px-4 py-1.5 rounded-full text-sm font-semibold transition " +
            (active ? "bg-ink text-cream-50" : "text-ink/70 hover:text-ink"), children: children }));
}
function OrderCard({ order }) {
    const isTable = order.listing_type === "table";
    return (_jsxs(Link, { to: `/orders/${order.id}`, className: "flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90 hover:shadow-float transition", children: [_jsx("img", { src: order.listing_snapshot.photo, alt: order.listing_snapshot.title, className: "w-24 h-24 rounded-xl object-cover flex-none" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "chip " + (isTable ? "chip-amber" : "chip-leaf"), children: isTable ? "🍽 Table" : "🛍 Market" }), _jsx(StatusBadge, { status: order.status })] }), _jsx("div", { className: "font-display font-bold text-lg leading-tight truncate", children: order.listing_snapshot.title }), _jsxs("div", { className: "text-xs text-ink/60", children: [order.listing_snapshot.host_name, " \u00B7 ", order.listing_snapshot.when] }), _jsxs("div", { className: "text-xs text-ink/60", children: [order.quantity, " \u00D7 ", order.listing_snapshot.currency, order.price_per_unit] })] }), _jsxs("div", { className: "text-right flex-none", children: [_jsx("div", { className: "text-[11px] text-ink/60", children: "Balance" }), _jsxs("div", { className: "font-display font-extrabold text-xl", children: [order.listing_snapshot.currency, order.balance_due.toFixed(2)] })] })] }));
}
function StatusBadge({ status }) {
    const map = {
        confirmed: { label: "Confirmed", cls: "bg-leaf/15 text-leaf-ink border-leaf/50" },
        completed: { label: "Completed", cls: "bg-ink/10 text-ink/80 border-ink/30" },
        cancelled_by_guest: { label: "Cancelled", cls: "bg-ink/10 text-ink/60 border-ink/20" },
        cancelled_by_host: { label: "Host cancelled", cls: "bg-ink/10 text-ink/60 border-ink/20" },
        no_show_guest: { label: "No-show", cls: "bg-amber/20 text-amber-ink border-amber/60" },
        no_show_host: { label: "Host no-show", cls: "bg-amber/20 text-amber-ink border-amber/60" },
    };
    const m = map[status];
    return (_jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border " + m.cls, children: m.label }));
}
function Empty({ tab }) {
    return (_jsxs("div", { className: "rounded-3xl border-2 border-dashed border-ink/30 p-10 text-center", children: [_jsxs("div", { className: "font-display font-extrabold text-2xl mb-2", children: ["No ", tab, " orders yet"] }), _jsx("p", { className: "text-ink/60 mb-5", children: tab === "upcoming"
                    ? "When you book a seat or order a product, it'll show up here."
                    : "Past meals and pickups will land here once they're done." }), _jsx(Link, { to: "/", className: "inline-block px-5 py-3 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold", children: "Browse the map" })] }));
}
