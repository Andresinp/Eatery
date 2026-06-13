// Map style selector — uses Mapbox when VITE_MAPBOX_TOKEN is set,
// falls back to OpenFreeMap (no key) otherwise. MapLibre GL JS reads
// both formats natively, so we only need to swap the style URL.

const token = import.meta.env.VITE_MAPBOX_TOKEN;

export const MAP_STYLE_URL = token
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${token}`
  : "https://tiles.openfreemap.org/styles/positron";

export const usingMapbox = !!token;
