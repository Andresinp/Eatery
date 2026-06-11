import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { mockListings } from "../data/mockListings";
import { depositFor, useOrders, MOCK_EXACT_ADDRESSES } from "../store/orders";
export default function Checkout() {
    const { id = "" } = useParams();
    const [search] = useSearchParams();
    const addOrder = useOrders((s) => s.addOrder);
    const listing = useMemo(() => mockListings.find((l) => l.id === id), [id]);
    const qty = Math.max(1, parseInt(search.get("qty") || "1", 10));
    const [card, setCard] = useState({ number: "", exp: "", cvc: "" });
    const [processing, setProcessing] = useState(false);
    const [done, setDone] = useState(null);
    if (!listing) {
        return (_jsxs("div", { className: "min-h-full", children: [_jsx(TopBar, { back: true, title: "Checkout" }), _jsx("div", { className: "p-6 text-ink/70", children: "Listing not found." })] }));
    }
    const isTable = listing.listing_type === "table";
    const { total, deposit, balance } = depositFor(listing.price_per_unit, qty);
    const when = isTable
        ? listing.meal_time
        : `${listing.pickup_window_start}–${listing.pickup_window_end}`;
    const canPay = card.number.replace(/\s/g, "").length >= 12 &&
        card.exp.length >= 4 &&
        card.cvc.length >= 3 &&
        !processing;
    const submit = () => {
        setProcessing(true);
        setTimeout(() => {
            const orderId = `o_${Math.random().toString(36).slice(2, 10)}`;
            addOrder({
                id: orderId,
                listing_id: listing.id,
                listing_type: listing.listing_type,
                listing_snapshot: {
                    title: listing.title,
                    photo: listing.photo,
                    host_name: listing.host_name,
                    host_avatar: listing.host_avatar,
                    currency: listing.currency,
                    location_display: listing.location_display,
                    when,
                },
                exact_address: MOCK_EXACT_ADDRESSES[listing.id] ?? listing.location_display,
                quantity: qty,
                price_per_unit: listing.price_per_unit,
                deposit_paid: deposit,
                balance_due: balance,
                status: "confirmed",
                host_confirmed: false,
                guest_confirmed: false,
                created_at: new Date().toISOString(),
            });
            setDone(orderId);
            setProcessing(false);
        }, 900);
    };
    if (done) {
        return (_jsxs("div", { className: "min-h-full bg-cream-50", children: [_jsx(TopBar, { back: true, title: "Confirmed" }), _jsxs("div", { className: "max-w-[560px] mx-auto px-4 py-10 text-center space-y-5", children: [_jsx("div", { className: "w-16 h-16 mx-auto rounded-full bg-leaf/20 border-2 border-leaf grid place-items-center text-3xl", children: "\u2713" }), _jsxs("h1", { className: "font-display font-extrabold text-3xl", children: ["You're in. ", listing.host_name, " has been notified."] }), _jsxs("p", { className: "text-ink/70", children: ["Your ", isTable ? "seat" : "order", " for", " ", _jsx("span", { className: "font-semibold", children: listing.title }), " is confirmed."] }), _jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-white p-4 text-left space-y-2", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-ink/60", children: "Address" }), _jsx("div", { className: "font-display font-bold text-lg", children: MOCK_EXACT_ADDRESSES[listing.id] }), _jsx("div", { className: "text-xs text-ink/60", children: when })] }), _jsxs("div", { className: "rounded-2xl border border-ink/10 bg-white p-4 text-left text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-ink/70", children: "Deposit charged" }), _jsxs("span", { className: "font-semibold", children: [listing.currency, deposit.toFixed(2)] })] }), _jsxs("div", { className: "flex justify-between mt-1", children: [_jsxs("span", { className: "text-ink/70", children: ["Balance to ", listing.host_name, " on ", isTable ? "arrival" : "pickup"] }), _jsxs("span", { className: "font-semibold", children: [listing.currency, balance.toFixed(2)] })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Link, { to: "/", className: "flex-1 py-3 rounded-2xl border-2 border-ink font-semibold text-center", children: "Back to map" }), _jsx(Link, { to: `/orders/${done}`, className: "flex-1 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold text-center", children: "View order" })] })] })] }));
    }
    return (_jsxs("div", { className: "min-h-full bg-cream-50 pb-32", children: [_jsx(TopBar, { back: true, title: "Checkout" }), _jsxs("div", { className: "max-w-[560px] mx-auto px-4 py-5 space-y-5", children: [_jsxs("div", { className: "flex gap-3 p-3 rounded-2xl bg-white border-2 border-ink/90", children: [_jsx("img", { src: listing.photo, alt: listing.title, className: "w-20 h-20 rounded-xl object-cover flex-none" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "text-xs text-ink/60", children: [isTable ? "🍽 Table with" : "🛍 Market from", " ", listing.host_name] }), _jsx("div", { className: "font-display font-bold text-lg leading-tight truncate", children: listing.title }), _jsxs("div", { className: "text-xs text-ink/60", children: [qty, " \u00D7 ", listing.currency, listing.price_per_unit, " \u00B7 ", when] })] })] }), _jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-3", children: [_jsx("div", { className: "font-display font-bold text-lg", children: "Payment" }), _jsxs("label", { className: "block", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-ink/60 mb-1", children: "Card number" }), _jsx("input", { inputMode: "numeric", placeholder: "4242 4242 4242 4242", value: card.number, onChange: (e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "") }), className: "w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "block", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-ink/60 mb-1", children: "Expiry" }), _jsx("input", { placeholder: "MM/YY", value: card.exp, onChange: (e) => setCard({ ...card, exp: e.target.value }), className: "w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink" })] }), _jsxs("label", { className: "block", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-ink/60 mb-1", children: "CVC" }), _jsx("input", { placeholder: "123", value: card.cvc, onChange: (e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "") }), className: "w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink" })] })] }), _jsx("div", { className: "text-xs text-ink/60", children: "Stripe will be wired here. Today, this is a mock for the UI flow." })] }), _jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-amber/15 p-4 space-y-1.5 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-ink/80", children: "Order total" }), _jsxs("span", { className: "font-semibold", children: [listing.currency, total.toFixed(2)] })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "font-display font-bold", children: "You pay now (deposit)" }), _jsxs("span", { className: "font-display font-extrabold text-xl", children: [listing.currency, deposit.toFixed(2)] })] }), _jsxs("div", { className: "flex justify-between text-ink/70", children: [_jsxs("span", { children: ["You pay ", listing.host_name, " on ", isTable ? "arrival" : "pickup"] }), _jsxs("span", { children: [listing.currency, balance.toFixed(2)] })] })] })] }), _jsx("div", { className: "fixed left-0 right-0 bottom-0 z-30 p-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pt-8", children: _jsx("div", { className: "max-w-[560px] mx-auto", children: _jsx("button", { disabled: !canPay, onClick: submit, className: "w-full py-3.5 rounded-2xl font-semibold text-base border-2 border-ink bg-ink text-cream-50 disabled:opacity-40", children: processing
                            ? "Processing…"
                            : `Pay ${listing.currency}${deposit.toFixed(2)} deposit` }) }) })] }));
}
