import { useEffect, useRef, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import maplibregl, { Map as MLMap, Marker } from "maplibre-gl";
import Logo from "../components/Logo";
import FloatingButtons from "../components/FloatingButtons";
import ListingSheet from "../components/ListingSheet";
import ListView from "../components/ListView";
import FilterPanel from "../components/FilterPanel";
import ViewToggle from "../components/ViewToggle";
import { MAP_CENTER } from "../data/mockListings";
import {
  MAP_STYLE_URL,
  getBrowserLocation,
  readLastCenter,
  resolveInitialCenter,
  saveLastCenter,
  type LngLat,
} from "../lib/map";
import { useAllListings } from "../lib/listings";
import { useNotifications } from "../store/notifications";
import { useProfile } from "../store/profile";
import { useT } from "../i18n";
import { useFilters, applyFilters } from "../store/filters";
import type { Listing } from "../types";

// Inline SVG for the product/market map marker: bordeaux dot bg (via CSS) +
// beige placemat circle + kraft delivery bag with handles and food-dome stamp.
const PRODUCT_ICON =
  `<svg viewBox="0 0 20 20" width="20" height="20" xmlns="http://www.w3.org/2000/svg" style="display:block">` +
  `<circle cx="10" cy="10" r="7" fill="#EDD9B5"/>` +
  `<rect x="6.5" y="9.5" width="7" height="6" rx="0.6" fill="#C4924A"/>` +
  `<rect x="6" y="8" width="8" height="2" rx="0.5" fill="#A97838"/>` +
  `<path d="M7.5 8 Q7.5 6 10 6 Q12.5 6 12.5 8" fill="none" stroke="#7A5020" stroke-width="1.2" stroke-linecap="round"/>` +
  `<path d="M7.5 13.8 Q10 12 12.5 13.8" fill="#A97838"/>` +
  `<rect x="7.5" y="13.8" width="5" height="0.7" rx="0.3" fill="#8B6030"/>` +
  `</svg>`;

export default function MapHome() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const meMarkerRef = useRef<Marker | null>(null);
  const [selected, setSelected] = useState<Listing | null>(null);
  const [showList, setShowList] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<LngLat | null>(null);

  const { listings, loading } = useAllListings();
  const filters = useFilters();
  const filteredListings = useMemo(() => applyFilters(listings, filters), [listings, filters]);
  const unread = useNotifications((s) => s.items.filter((n) => !n.read).length);
  const avatar = useProfile((s) => s.me.avatar);
  const t = useT();

  // Drop / move a "you are here" marker.
  const setMeMarker = (center: LngLat) => {
    const map = mapRef.current;
    if (!map) return;
    if (meMarkerRef.current) {
      meMarkerRef.current.setLngLat(center);
    } else {
      const el = document.createElement("div");
      el.className = "me-marker";
      el.setAttribute("aria-label", "Your location");
      meMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(center)
        .addTo(map);
    }
  };

  // Init map once. We start from the last known center (or the app default) and
  // then asynchronously resolve the real location — GPS first, IP next — so the
  // map never gets stuck on a hard-coded city.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: readLastCenter() ?? MAP_CENTER,
      zoom: 13.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    let cancelled = false;
    let userInteracted = false;
    const markInteracted = () => {
      userInteracted = true;
    };
    map.on("dragstart", markInteracted);
    map.on("zoomstart", markInteracted);

    resolveInitialCenter(readLastCenter() ?? MAP_CENTER).then(({ center, source }) => {
      if (cancelled || source === "fallback" || userInteracted) return;
      saveLastCenter(center);
      map.flyTo({ center, zoom: source === "gps" ? 14 : 12, duration: 800 });
      if (source === "gps") {
        setMeMarker(center);
        setUserLocation(center);
      }
    });

    return () => {
      cancelled = true;
      map.off("dragstart", markInteracted);
      map.off("zoomstart", markInteracted);
      map.remove();
      mapRef.current = null;
      meMarkerRef.current = null;
    };
  }, []);

  // Build markers — rebuilds whenever the filtered set changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const addAll = () => {
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      filteredListings.forEach((l) => {
        const isTable = l.listing_type === "table";
        // Outer element: MapLibre writes its positioning transform here every
        // frame, so it must have NO CSS transition — otherwise markers lag and
        // "swing" as the map pans. The inner `.pin` owns all visual styling and
        // hover/active animation, which MapLibre never touches.
        const el = document.createElement("button");
        el.className = "pin-marker";
        el.innerHTML = `
          <span class="pin ${isTable ? "pin-amber" : "pin-bordeaux"}">
            <span class="dot">${isTable ? "🍽" : PRODUCT_ICON}</span><span class="price">${l.currency}${l.price_per_unit}</span>
          </span>`;
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
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([l.location_lng, l.location_lat])
          .addTo(map);
        markersRef.current[l.id] = marker;
      });
    };

    if (map.isStyleLoaded()) addAll();
    else map.once("load", addAll);
  }, [filteredListings]);

  // Highlight active pin
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, m]) => {
      const el = m.getElement();
      if (selected && id === selected.id) el.classList.add("active");
      else el.classList.remove("active");
    });
  }, [selected]);

  // Recenter on the user's *actual* current location (high accuracy). Falls back
  // to the last known center if permission is blocked or the fix times out.
  const handleLocate = async () => {
    const map = mapRef.current;
    if (!map || locating) return;
    setLocating(true);
    try {
      const center = await getBrowserLocation();
      saveLastCenter(center);
      setMeMarker(center);
      setUserLocation(center);
      map.flyTo({ center, zoom: 15, duration: 700 });
    } catch {
      const fallback = readLastCenter();
      if (fallback) map.flyTo({ center: fallback, zoom: 13.2, duration: 700 });
      // Surface a hint so taps don't feel silently broken.
      alert(t("fab.locateDenied"));
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-cream-50">
      {/* Top bar — a single clean row holds the logo, the Guest/Host switch,
          notifications and the profile avatar. The language selector now lives
          in Profile → Settings → Language to keep the map uncluttered. */}
      <header className="absolute top-0 left-0 right-0 z-30 px-3 pt-4 pb-3 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto flex-none">
          <Logo />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 pointer-events-auto flex-none">
          <ViewToggle mode="guest" />
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative w-10 h-10 rounded-full bg-cream-50 border-2 border-ink grid place-items-center shadow-float"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-ink shadow-float"
          >
            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
          </Link>
        </div>
      </header>

      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading indicator while listings load from the database */}
      {loading && (
        <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-cream-50 border-2 border-ink shadow-float text-sm font-semibold">
          {t("common.loading")}
        </div>
      )}

      {/* List view overlay — sorted by distance from GPS or current map center */}
      {showList && (
        <ListView
          listings={filteredListings}
          userLocation={
            userLocation ?? (mapRef.current
              ? [mapRef.current.getCenter().lng, mapRef.current.getCenter().lat]
              : null)
          }
        />
      )}

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
      <FilterPanel open={showFilter} onClose={() => setShowFilter(false)} listings={listings} />
    </div>
  );
}
