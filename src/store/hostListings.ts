import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Listing } from "../types";

interface HostState {
  myListings: Listing[];
  add: (l: Listing) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Record<string, unknown>) => void;
  getById: (id: string) => Listing | undefined;
}

export const useHost = create<HostState>()(
  persist(
    (set, get) => ({
      myListings: [],
      add: (l) => set((s) => ({ myListings: [l, ...s.myListings] })),
      remove: (id) =>
        set((s) => ({ myListings: s.myListings.filter((l) => l.id !== id) })),
      update: (id, patch) =>
        set((s) => ({
          myListings: s.myListings.map((l) =>
            l.id === id ? ({ ...(l as object), ...patch } as unknown as Listing) : l,
          ),
        })),
      getById: (id) => get().myListings.find((l) => l.id === id),
    }),
    { name: "eatery-host-listings" },
  ),
);

// Mock host identity — would come from Supabase auth profile
export const ME = {
  id: "me",
  name: "You",
  avatar:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80",
  rating: 4.9,
  verified: false,
};
