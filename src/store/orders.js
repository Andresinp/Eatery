import { create } from "zustand";
import { persist } from "zustand/middleware";
export const useOrders = create()(persist((set, get) => ({
    orders: [],
    addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
    updateOrder: (id, patch) => set((s) => ({
        orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    })),
    getById: (id) => get().orders.find((o) => o.id === id),
}), { name: "eatery-orders" }));
export function depositFor(price, quantity, rate = 0.12) {
    const total = price * quantity;
    const deposit = Math.round(total * rate * 100) / 100;
    return { total, deposit, balance: Math.round((total - deposit) * 100) / 100 };
}
// Mock exact addresses — would come from the listing row post-confirmation
export const MOCK_EXACT_ADDRESSES = {
    t1: "Calle del Pez 14, 3º Izq, 28004 Madrid",
    t2: "Calle Argumosa 22, Bajo, 28012 Madrid",
    t3: "Calle de Fuencarral 89, 5ºA, 28004 Madrid",
    t4: "Calle Conde Duque 11, Ático, 28015 Madrid",
    m1: "Plaza de la Paja 8, 28005 Madrid",
    m2: "Calle de Goya 47, 28001 Madrid",
    m3: "Calle de Embajadores 64, 28012 Madrid",
    m4: "Calle de Alfonso XII 24, 28014 Madrid",
};
