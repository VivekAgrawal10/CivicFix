// Leaflet map configuration.
// Leaflet itself is free and needs NO API key. The default tiles come from OpenStreetMap (also keyless).
// To use a keyed tile provider (MapTiler, Stadia Maps, Thunderforest, Mapbox styles, ...) put in frontend/.env:
//   VITE_MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key={key}
//   VITE_MAP_API_KEY=your_key
//   VITE_MAP_ATTRIBUTION=&copy; MapTiler &copy; OpenStreetMap contributors   (optional)
const env = import.meta.env;

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const template = env.VITE_MAP_TILE_URL || OSM_URL;

export const TILE_URL = template.replace('{key}', encodeURIComponent(env.VITE_MAP_API_KEY || ''));
export const TILE_ATTRIBUTION = env.VITE_MAP_ATTRIBUTION || (env.VITE_MAP_TILE_URL ? '&copy; OpenStreetMap contributors' : OSM_ATTRIBUTION);
export const TILE_MAX_ZOOM = 19;

// Used only until the browser gives us the citizen's position or reports exist (Thapar University, Patiala)
export const DEFAULT_CENTER = [30.3532, 76.3685];

// Free OpenStreetMap geocoder (search an address / reverse lookup). Light, user-triggered use only.
export const NOMINATIM = 'https://nominatim.openstreetmap.org';
