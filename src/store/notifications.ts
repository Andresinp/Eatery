import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NotifType =
  | "booking_confirmed"
  | "booking_received"
  | "order_cancelled"
  | "reminder"
  | "message"
  | "review_request"
  | "no_show"
  | "system";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  data?: { order_id?: string; listing_id?: string };
  created_at: string;
}

interface NotifState {
  items: Notification[];
  unread: () => number;
  push: (n: Omit<Notification, "id" | "read" | "created_at">) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
}

export const useNotifications = create<NotifState>()(
  persist(
    (set, get) => ({
      items: [
        {
          id: "n_seed_1",
          type: "system",
          title: "Welcome to Eatery",
          body: "Tap a pin to see what's cooking near you.",
          read: false,
          created_at: new Date().toISOString(),
        },
      ],
      unread: () => get().items.filter((n) => !n.read).length,
      push: (n) =>
        set((s) => ({
          items: [
            {
              id: `n_${Math.random().toString(36).slice(2, 10)}`,
              read: false,
              created_at: new Date().toISOString(),
              ...n,
            },
            ...s.items,
          ],
        })),
      markAllRead: () =>
        set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) })),
      markRead: (id) =>
        set((s) => ({
          items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
    }),
    { name: "eatery-notifications" },
  ),
);
