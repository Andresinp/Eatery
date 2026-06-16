import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Listing } from "../types";

export type OrderStatus =
  | "confirmed"
  | "completed"
  | "cancelled_by_guest"
  | "cancelled_by_host"
  | "no_show_guest"
  | "no_show_host";

export interface Order {
  id: string;
  listing_id: string;
  listing_type: "table" | "market";
  listing_snapshot: Pick<
    Listing,
    "title" | "photo" | "host_name" | "host_avatar" | "currency" | "location_display"
  > & {
    // Human-readable time shown in the UI (e.g. "28 June 2026 · 20:30–23:00").
    when: string;
    // Machine-readable ISO start, kept for cancellation-policy timing. Optional
    // so orders persisted before this field still load.
    starts_at?: string;
  };
  exact_address: string;
  quantity: number;
  price_per_unit: number;
  deposit_paid: number;
  balance_due: number;
  payment_intent_id?: string;
  status: OrderStatus;
  host_confirmed: boolean;
  guest_confirmed: boolean;
  created_at: string;
}

interface OrdersState {
  orders: Order[];
  addOrder: (o: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
  getById: (id: string) => Order | undefined;
}

export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
      updateOrder: (id, patch) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      getById: (id) => get().orders.find((o) => o.id === id),
    }),
    { name: "eatery-orders" },
  ),
);

export function depositFor(price: number, quantity: number, rate = 0.12) {
  const total = price * quantity;
  const deposit = Math.round(total * rate * 100) / 100;
  return { total, deposit, balance: Math.round((total - deposit) * 100) / 100 };
}

// Mock exact addresses — would come from the listing row post-confirmation
export const MOCK_EXACT_ADDRESSES: Record<string, string> = {
  t1: "Calle del Pez 14, 3º Izq, 28004 Madrid",
  t2: "Calle Argumosa 22, Bajo, 28012 Madrid",
  t3: "Calle de Fuencarral 89, 5ºA, 28004 Madrid",
  t4: "Calle Conde Duque 11, Ático, 28015 Madrid",
  m1: "Plaza de la Paja 8, 28005 Madrid",
  m2: "Calle de Goya 47, 28001 Madrid",
  m3: "Calle de Embajadores 64, 28012 Madrid",
  m4: "Calle de Alfonso XII 24, 28014 Madrid",
};
