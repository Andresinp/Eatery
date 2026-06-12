import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Message {
  id: string;
  order_id: string;
  sender_id: string;          // "me" or host_id
  content: string;
  created_at: string;
}

interface MessagesState {
  byOrder: Record<string, Message[]>;
  forOrder: (orderId: string) => Message[];
  send: (orderId: string, senderId: string, content: string) => void;
  seedFromHost: (orderId: string, hostId: string, hostName: string) => void;
}

export const useMessages = create<MessagesState>()(
  persist(
    (set, get) => ({
      byOrder: {},
      forOrder: (orderId) => get().byOrder[orderId] ?? [],
      send: (orderId, senderId, content) => {
        const m: Message = {
          id: `m_${Math.random().toString(36).slice(2, 10)}`,
          order_id: orderId,
          sender_id: senderId,
          content,
          created_at: new Date().toISOString(),
        };
        set((s) => ({
          byOrder: { ...s.byOrder, [orderId]: [...(s.byOrder[orderId] ?? []), m] },
        }));
      },
      seedFromHost: (orderId, hostId, hostName) => {
        if (get().byOrder[orderId]?.length) return;
        const m: Message = {
          id: `m_seed_${orderId}`,
          order_id: orderId,
          sender_id: hostId,
          content: `Hi! Thanks for booking — I'll send you the door code closer to the time. Excited to cook for you. — ${hostName}`,
          created_at: new Date().toISOString(),
        };
        set((s) => ({ byOrder: { ...s.byOrder, [orderId]: [m] } }));
      },
    }),
    { name: "eatery-messages" },
  ),
);
