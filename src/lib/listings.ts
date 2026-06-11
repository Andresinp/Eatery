import { mockListings } from "../data/mockListings";
import { useHost } from "../store/hostListings";
import type { Listing } from "../types";

export function useAllListings(): Listing[] {
  const mine = useHost((s) => s.myListings);
  return [...mine, ...mockListings];
}

export function findListing(id: string): Listing | undefined {
  return useHost.getState().myListings.find((l) => l.id === id)
    ?? mockListings.find((l) => l.id === id);
}
