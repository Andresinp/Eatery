import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Profile {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  email: string;
  phone_verified: boolean;
  identity_verified: boolean;
  dietary_prefs: string[];
  allergen_exclusions: string[];
  language: string;
  notif: {
    bookings: boolean;
    reminders: boolean;
    messages: boolean;
    reviews: boolean;
    marketing: boolean;
  };
  onboarded: boolean;
}

const DEFAULT: Profile = {
  id: "me",
  name: "",
  bio: "",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80",
  email: "",
  phone_verified: false,
  identity_verified: false,
  dietary_prefs: [],
  allergen_exclusions: [],
  language: "en",
  notif: {
    bookings: true,
    reminders: true,
    messages: true,
    reviews: true,
    marketing: false,
  },
  onboarded: false,
};

interface ProfileState {
  me: Profile;
  update: (patch: Partial<Profile>) => void;
  reset: () => void;
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      me: DEFAULT,
      update: (patch) => set((s) => ({ me: { ...s.me, ...patch } })),
      reset: () => set({ me: DEFAULT }),
    }),
    { name: "eatery-profile" },
  ),
);
