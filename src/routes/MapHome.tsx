import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import Logo from "../components/Logo";
import FloatingButtons from "../components/FloatingButtons";
import ListingSheet from "../components/ListingSheet";
import ListView from "../components/ListView";
import FilterPanel from "../components/FilterPanel";
import { MAP_CENTER } from "../data/mockListings";
import { useAllListings } from "../lib/listings";
import { useNotifications } from "../store/notifications";
import { useProfile } from "../store/profile";
import type { Listing } from "../types";

// Free, no-API-key style. Swap to Mapbox via VITE_MAPBOX_TOKEN later.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export default function MapHome() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const [selected, setSelected] = useState<Listing | null>(null);
  const [showList, setShowList] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const listings = useAllListings();
  const nav = useNavigate();
  const unread = useNotifications((s) => s.items.filter((n) => !n.read).length);
  const avatar = useProfile((s) => s.me.avatar);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: MAP_CENTER,
      zoom: 13.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Build markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addAll = () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      listings.forEach((l) => {
        const el = document.createElement("button");
        const isTable = l.listing_type === "table";
        el.className = "pin " + (isTable ? "pin-amber" : "pin-leaf");
        el.innerHTML = `<span class="dot">${isTable ? "🍽" : "🛍"}</span><span>${l.currency}${l.price_per_unit}</span>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(l);
          map.flyTo({
            center: [l.location_lng, l.location_lat],
            zoom: Math.max(map.getZoom(), 14),
            offset: [0, -120],
            duration: 600,
          });
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([l.location_lng, l.location_lat])
          .addTo(map);
        markersRef.current[l.id] = marker;
      });
    };

    if (map.isStyleLoaded()) addAll();
    else map.once("load", addAll);
  }, [listings]);

  // Highlight active pin
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, m]) => {
      const el = m.getElement();
      if (selected && id === selected.id) el.classList.add("active");
      else el.classList.remove("active");
    });
  }, [selected]);

  const handleLocate = () => {
    mapRef.current?.flyTo({ center: MAP_CENTER, zoom: 13.2, duration: 700 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-cream-50">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-3 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <Logo />
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link
            to="/orders"
            className="px-3 h-11 rounded-full bg-cream-50 border-2 border-ink grid place-items-center text-sm font-semibold shadow-float"
          >
            Orders
          </Link>
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative w-11 h-11 rounded-full bg-cream-50 border-2 border-ink grid place-items-center shadow-float"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber border-2 border-ink text-[10px] font-bold text-amber-ink grid place-items-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            className="w-11 h-11 rounded-full overflow-hidden border-2 border-ink shadow-float"
          >
            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
          </Link>
        </div>
      </header>

      {/* Mode pill */}
      <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-1 p-1 rounded-full bg-cream-50 border-2 border-ink shadow-float">
          <button className="px-4 py-1.5 rounded-full bg-ink text-cream-50 text-sm font-semibold">
            Guest
          </button>
          <button
            onClick={() => nav("/host")}
            className="px-4 py-1.5 rounded-full text-ink/70 text-sm font-semibold hover:text-ink"
          >
            Host
          </button>
        </div>
      </div>

      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* List view overlay */}
      {showList && <ListView listings={listings} />}

      {/* Floating actions */}
      <FloatingButtons
        onFilter={() => setShowFilter(true)}
        onToggleList={() => setShowList((v) => !v)}
        onLocate={handleLocate}
        listActive={showList}
      />

      {/* Bottom sheet */}
      {selected && !showList && (
        <ListingSheet listing={selected} onClose={() => setSelected(null)} />
      )}

      {/* Filter panel */}
      <FilterPanel open={showFilter} onClose={() => setShowFilter(false)} />
    </div>
  );
}
