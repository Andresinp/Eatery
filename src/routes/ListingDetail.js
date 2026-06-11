import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import PhotoCarousel from "../components/PhotoCarousel";
import QuantityStepper from "../components/QuantityStepper";
import { Chip } from "../components/Chip";
import { mockListings } from "../data/mockListings";
import { depositFor } from "../store/orders";
export default function ListingDetail() {
    const { id = "" } = useParams();
    const nav = useNavigate();
    const listing = useMemo(() => mockListings.find((l) => l.id === id), [id]);
    const [qty, setQty] = useState(1);
    if (!listing) {
        return (_jsxs("div", { className: "min-h-full", children: [_jsx(TopBar, { back: true, title: "Listing not found" }), _jsx("div", { className: "p-6 text-ink/70", children: "This listing no longer exists." })] }));
    }
    const isTable = listing.listing_type === "table";
    const max = isTable
        ? listing.seats_available
        : listing.quantity_available;
    const unit = isTable ? "seat" : "unit";
    const { total, deposit, balance } = depositFor(listing.price_per_unit, qty);
    return (_jsxs("div", { className: "min-h-full bg-cream-50 pb-32", children: [_jsx(TopBar, { back: true }), _jsx(PhotoCarousel, { photos: [listing.photo, listing.photo, listing.photo], alt: listing.title }), _jsx("div", { className: "max-w-[760px] mx-auto px-4 sm:px-6 -mt-6 relative", children: _jsxs("div", { className: "rounded-3xl bg-cream-50 border-2 border-ink/90 shadow-sheet p-5 sm:p-6 space-y-5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "chip " + (isTable ? "chip-amber" : "chip-leaf"), children: isTable ? "🍽 Table" : "🛍 Market" }), _jsx("span", { className: "text-xs text-ink/60", children: listing.location_display })] }), _jsx("h1", { className: "font-display font-extrabold text-3xl sm:text-4xl leading-[1.05]", children: listing.title }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("img", { src: listing.host_avatar, alt: listing.host_name, className: "w-12 h-12 rounded-full object-cover border border-ink/20" }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "font-semibold", children: listing.host_name }), listing.host_verified && (_jsx("span", { className: "text-amber-deep", title: "Verified", children: "\u2605" }))] }), _jsxs("div", { className: "text-xs text-ink/60", children: ["\u2605 ", listing.host_rating.toFixed(2), " \u00B7 ", isTable ? "Host" : "Maker"] })] })] }), _jsx("p", { className: "text-[15px] text-ink/85 leading-relaxed", children: listing.description }), _jsxs("div", { className: "flex flex-wrap gap-1.5", children: [isTable && (_jsxs(Chip, { variant: "amber", children: ["\u23F1 ", listing.meal_time] })), isTable && (_jsxs(Chip, { variant: "amber", children: [listing.seats_available, " / ", listing.seats_total, " seats"] })), isTable && (_jsx(Chip, { variant: "amber", children: listing.dining_setting })), !isTable && (_jsxs(Chip, { variant: "leaf", children: ["\u23F1 ", listing.pickup_window_start, "\u2013", listing.pickup_window_end] })), !isTable && (_jsxs(Chip, { variant: "leaf", children: [listing.quantity_available, " units left"] })), (isTable
                                    ? listing.cuisine_tags
                                    : listing.product_type_tags).map((t) => (_jsx(Chip, { children: t }, t))), listing.dietary_tags.map((t) => (_jsx(Chip, { children: t }, t)))] }), listing.allergen_flags.length > 0 && (_jsxs("div", { className: "rounded-2xl border border-amber/60 bg-amber/10 px-4 py-3 text-sm text-amber-ink", children: [_jsx("div", { className: "font-semibold mb-0.5", children: "\u26A0 Allergen alert" }), _jsxs("div", { children: ["This listing contains: ", listing.allergen_flags.join(", "), "."] })] })), _jsxs("div", { className: "rounded-2xl border border-ink/10 bg-white p-4", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-ink/60 mb-1", children: "Approximate location" }), _jsx("div", { className: "font-medium", children: listing.location_display }), _jsxs("div", { className: "text-xs text-ink/60 mt-1", children: ["Exact address shared after your ", isTable ? "booking" : "order", " is confirmed."] })] }), _jsx(QuantityStepper, { value: qty, max: Math.max(1, max), unit: unit, onChange: setQty }), _jsxs("div", { className: "rounded-2xl border-2 border-ink/90 bg-white p-4 space-y-1.5 text-sm", children: [_jsx(Row, { label: `Per ${unit}`, value: `${listing.currency}${listing.price_per_unit}` }), _jsx(Row, { label: `× ${qty}`, value: `${listing.currency}${total.toFixed(2)}` }), _jsx("div", { className: "border-t border-ink/10 my-2" }), _jsx(Row, { label: "Deposit (paid now)", value: `${listing.currency}${deposit.toFixed(2)}`, bold: true }), _jsx(Row, { label: `Balance — paid to host on ${isTable ? "arrival" : "pickup"}`, value: `${listing.currency}${balance.toFixed(2)}`, muted: true })] })] }) }), _jsx("div", { className: "fixed left-0 right-0 bottom-0 z-30 p-3 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent pt-8", children: _jsx("div", { className: "max-w-[760px] mx-auto", children: _jsx("button", { onClick: () => nav(`/listing/${listing.id}/book?qty=${qty}`), disabled: max < 1, className: "w-full py-3.5 rounded-2xl font-semibold text-base border-2 border-ink transition disabled:opacity-50 " +
                            (isTable
                                ? "bg-amber text-amber-ink hover:bg-amber-deep hover:text-cream-50"
                                : "bg-leaf text-leaf-ink hover:bg-leaf-deep hover:text-cream-50"), children: max < 1 ? "Sold out" : isTable ? "Book a Seat" : "Order Now" }) }) })] }));
}
function Row({ label, value, bold, muted, }) {
    return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: muted ? "text-ink/60" : "text-ink/80", children: label }), _jsx("span", { className: bold ? "font-display font-extrabold text-lg" : "font-medium", children: value })] }));
}
