import { useEffect, useMemo, useState } from "react";
import { fetchListing, fetchListings } from "./db";
import { useHost } from "../store/hostListings";
import type { Listing } from "../types";

/**
 * Live listings for the map / list views.
 *
 * Always reads from the database (see `fetchListings`). Locally-drafted host
 * listings (kept in the persisted `useHost` store) are merged on top so a host
 * sees their own work-in-progress alongside the real data. When Supabase isn't
 * configured, `fetchListings` falls back to the bundled sample data.
 */
export function useAllListings(): { listings: Listing[]; loading: boolean } {
  const mine = useHost((s) => s.myListings);
  const [remote, setRemote] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchListings()
      .then((data) => {
        if (active) setRemote(data);
      })
      .catch(() => {
        if (active) setRemote([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const listings = useMemo(() => {
    const ids = new Set(mine.map((l) => l.id));
    return [...mine, ...remote.filter((l) => !ids.has(l.id))];
  }, [mine, remote]);

  return { listings, loading };
}

/** A single listing, from the local host draft store or the database. */
export function useListing(id: string): { listing: Listing | undefined; loading: boolean } {
  const local = useHost((s) => s.myListings.find((l) => l.id === id));
  const [remote, setRemote] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(!local);

  useEffect(() => {
    if (local) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetchListing(id)
      .then((data) => {
        if (active) setRemote(data);
      })
      .catch(() => {
        if (active) setRemote(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, local]);

  return { listing: local ?? remote ?? undefined, loading };
}
