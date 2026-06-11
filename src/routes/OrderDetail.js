import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useOrders } from "../store/orders";
export default function OrderDetail() {
    const { id = "" } = useParams();
    const order = useOrders((s) => s.getById(id));
    const updateOrder = useOrders((s) => s.updateOrder);
    const [confirming, setConfirming] = useState(false);
    const [review, setReview] = useState(null);
    if (!order) {
        return (_jsxs("div", { className: "min-h-full", children: [_jsx(TopBar, { back: true, title: "Order" }), _jsxs("div", { className: "p-6 text-ink/70", children: ["We couldn't find that order.", " ", _jsx(Link, { className: "underline", to: "/orders", children: "Back to orders" })] })] }));
    }
    const isTable = order.listing_type === "table";
    const snap = order.listing_snapshot;
    const showConfirmPrompt = order.status === "confirmed" && !order.guest_confirmed;
    const onAttended = (attended) => {
        if (attended) {
            updateOrder(order.id, { guest_confirmed: true });
            setConfirming(true);
        }
        else {
            updateOrder(order.id, { status: "no_show_host", guest_confirmed: true });
        }
    };
    const submitReview = () => {
        if (!review)
            return;
        updateOrder(order.id, { status: "completed" });
        setConfirming(false);
    };
    return (_jsxs("div", { className: "min-h-full bg-cream-50 pb-20", children: [_jsx(TopBar, { back: true, title: "Order detail" }), _jsxs("div", { className: "max-w-[640px] mx-auto px-4 py-4 space-y-5", children: [_jsxs("div", { className: "rounded-3xl overflow-hidden border-2 border-ink/90 bg-white", children: [_jsx("img", { src: snap.photo, alt: snap.title, className: "w-full h-48 object-cover" }), _jsxs("div", { className: "p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [_jsx("span", { className: "chip " + (isTable ? "chip-amber" : "chip-leaf"), children: isTable ? "🍽 Table" : "🛍 Market" }), _jsx("span", { className: "text-xs text-ink/60", children: snap.location_display })] }), _jsx("h1", { className: "font-display font-extrabold text-2xl leading-tight", children: snap.title }), _jsxs("div", { className: "flex items-center gap-3 mt-3", children: [_jsx("img", { src: snap.host_avatar, alt: snap.host_name, className: "w-9 h-9 rounded-full object-cover border border-ink/20" }), _jsxs("div", { className: "text-sm", children: [_jsx("div", { className: "font-semibold", children: snap.host_name }), _jsx("div", { className: "text-xs text-ink/60", children: snap.when })] })] })] })] }), _jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-white p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-ink/60 mb-1", children: "Exact address" }), _jsx("div", { className: "font-display font-bold text-lg", children: order.exact_address }), _jsx("div", { className: "text-xs text-ink/60 mt-1", children: snap.when })] }), _jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-1.5 text-sm", children: [_jsx(Row, { label: "Quantity", value: `${order.quantity} × ${snap.currency}${order.price_per_unit}` }), _jsx(Row, { label: "Deposit paid", value: `${snap.currency}${order.deposit_paid.toFixed(2)}` }), _jsx(Row, { label: `Balance to ${snap.host_name} on ${isTable ? "arrival" : "pickup"}`, value: `${snap.currency}${order.balance_due.toFixed(2)}`, bold: true })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { className: "flex-1 py-3 rounded-2xl border-2 border-ink font-semibold", children: "Message host" }), _jsx("button", { className: "flex-1 py-3 rounded-2xl border-2 border-ink font-semibold", children: "Cancel" })] }), showConfirmPrompt && !confirming && (_jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-amber/15 p-4 space-y-3", children: [_jsx("div", { className: "font-display font-extrabold text-lg", children: isTable ? `Did you attend the meal with ${snap.host_name}?` : `Did you pick up your order from ${snap.host_name}?` }), _jsxs("p", { className: "text-sm text-ink/70", children: ["Confirm so ", snap.host_name, " can review you, and you can review them."] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => onAttended(false), className: "flex-1 py-2.5 rounded-2xl border-2 border-ink font-semibold", children: "No" }), _jsxs("button", { onClick: () => onAttended(true), className: "flex-1 py-2.5 rounded-2xl border-2 border-ink bg-amber text-amber-ink font-semibold", children: ["Yes, I ", isTable ? "attended" : "picked up"] })] })] })), confirming && (_jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-3", children: [_jsxs("div", { className: "font-display font-extrabold text-lg", children: ["Review ", snap.host_name] }), _jsx("div", { className: "flex items-center gap-1", children: [1, 2, 3, 4, 5].map((n) => (_jsx("button", { onClick: () => setReview({ rating: n, comment: review?.comment ?? "" }), "aria-label": `${n} stars`, className: "w-10 h-10 rounded-full grid place-items-center text-xl border-2 transition " +
                                        ((review?.rating ?? 0) >= n
                                            ? "bg-amber text-amber-ink border-amber-deep"
                                            : "bg-cream-50 text-ink/40 border-ink/20"), children: "\u2605" }, n))) }), _jsx("textarea", { placeholder: "What was it like?", value: review?.comment ?? "", onChange: (e) => setReview({ rating: review?.rating ?? 0, comment: e.target.value }), rows: 3, className: "w-full px-3 py-2.5 rounded-xl border border-ink/20 bg-cream-50 focus:outline-none focus:border-ink resize-none" }), _jsx("button", { onClick: submitReview, disabled: !review?.rating, className: "w-full py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40", children: "Submit review" })] }))] })] }));
}
function Row({ label, value, bold }) {
    return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-ink/70", children: label }), _jsx("span", { className: bold ? "font-display font-extrabold text-lg" : "font-medium", children: value })] }));
}
