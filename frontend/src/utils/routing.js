// Hazard-aware routing.
//
// 1. Ask the free OSRM routing server for the fastest road route (plus its alternatives) between A and B.
// 2. Count the open, citizen-reported road problems (potholes, road damage, waterlogging, broken drains)
//    that lie within HAZARD_RADIUS_M of each route.
// 3. If the fastest route is clean, recommend it. If it passes a hazard, recommend the next-fastest route
//    that avoids it. If every route returned hits a hazard, try two detours that bend around the worst
//    hazard, then pick the route with the lowest hazard score (never a huge detour for a small problem).
//
// Pure JS (no React, no import.meta) so the logic can be unit-tested with plain Node.

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

export const HAZARD_RADIUS_M = 30;          // a report this close to the road line is "on the route"
const DETOUR_OFFSET_M = 350;                // how far to bend around the worst hazard when no clean alternative exists
const ROAD_CATEGORIES = new Set(['pothole', 'road damage', 'waterlogging', 'broken drain']);
const WEIGHT = { critical: 5, high: 3, medium: 2, low: 1 };

// ---------- geometry ----------
const KM_LAT = 110540;
const toXY = (p, lat0) => ({ x: p[1] * 111320 * Math.cos((lat0 * Math.PI) / 180), y: p[0] * KM_LAT });

export function distanceToSegmentMeters(pt, a, b) {
  const lat0 = pt[0];
  const P = toXY(pt, lat0), A = toXY(a, lat0), B = toXY(b, lat0);
  const dx = B.x - A.x, dy = B.y - A.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(P.x - (A.x + t * dx), P.y - (A.y + t * dy));
}

// Smallest distance (metres) from a point to a polyline, plus the index of the nearest segment.
export function distanceToPathMeters(pt, path) {
  let best = Infinity, index = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = distanceToSegmentMeters(pt, path[i], path[i + 1]);
    if (d < best) { best = d; index = i; }
  }
  return { distance: best, index };
}

export function offsetPoint(p, bearingRad, meters) {
  return [
    p[0] + (meters * Math.cos(bearingRad)) / KM_LAT,
    p[1] + (meters * Math.sin(bearingRad)) / (111320 * Math.cos((p[0] * Math.PI) / 180)),
  ];
}

const bearing = (a, b) => {
  const lat0 = a[0];
  const A = toXY(a, lat0), B = toXY(b, lat0);
  return Math.atan2(B.x - A.x, B.y - A.y); // 0 = north, clockwise
};

// ---------- hazards ----------
export function isRoadHazard(inc) {
  if (!inc || !(inc.lat || inc.lng)) return false;
  if (inc.status === 'Completed') return false;
  return ROAD_CATEGORIES.has(String(inc.category || '').toLowerCase());
}

export const hazardWeight = (inc) => WEIGHT[String(inc.aiData && inc.aiData.severity).toLowerCase()] || 1;

export function scoreRoute(route, hazards, radius = HAZARD_RADIUS_M) {
  const hits = [];
  for (const h of hazards) {
    const { distance, index } = distanceToPathMeters([h.lat, h.lng], route.path);
    if (distance <= radius) hits.push({ id: h.id, title: h.title, category: h.category, severity: h.aiData && h.aiData.severity, lat: h.lat, lng: h.lng, distance: Math.round(distance), index, weight: hazardWeight(h) });
  }
  return { ...route, hazards: hits, score: hits.reduce((s, h) => s + h.weight, 0) };
}

// ---------- network ----------
async function getJson(url, ms = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

// points: [[lat,lng], [lat,lng], ...] (A, optional via points, B)
export async function fetchRoutes(points, alternatives = true) {
  const coords = points.map((p) => `${p[1]},${p[0]}`).join(';');
  const data = await getJson(`${OSRM}/${coords}?alternatives=${alternatives ? 3 : 'false'}&overview=full&geometries=geojson&steps=false`);
  if (data.code !== 'Ok' || !data.routes || !data.routes.length) throw new Error(data.message || 'No drivable route found between these two places.');
  return data.routes.map((r) => ({ path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]), duration: r.duration, distance: r.distance }));
}

export async function geocode(query) {
  const hits = await getJson(`${NOMINATIM_URL}/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`);
  return hits.map((h) => ({ label: h.display_name, lat: parseFloat(h.lat), lng: parseFloat(h.lon) }));
}

export async function reverseGeocode(lat, lng) {
  const d = await getJson(`${NOMINATIM_URL}/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`);
  return d && d.display_name ? d.display_name : null;
}

// ---------- planner ----------
// fetcher is injectable so the logic can be tested without a network.
export async function planRoute(a, b, incidents, { fetcher = fetchRoutes } = {}) {
  const hazards = incidents.filter(isRoadHazard);
  const base = await fetcher([a, b], true);
  let candidates = base.map((r) => scoreRoute({ ...r, source: 'alternative' }, hazards));
  candidates.sort((x, y) => x.duration - y.duration);
  const fastest = candidates[0];

  // No clean route yet? Bend around the worst hazard on the fastest route (left and right) and see if that is clean.
  if (fastest.score > 0 && !candidates.some((c) => c.score === 0)) {
    const worst = [...fastest.hazards].sort((x, y) => y.weight - x.weight)[0];
    const i = worst.index;
    const heading = bearing(fastest.path[Math.max(0, i - 2)], fastest.path[Math.min(fastest.path.length - 1, i + 3)]);
    const tries = [heading + Math.PI / 2, heading - Math.PI / 2].map((h) => offsetPoint([worst.lat, worst.lng], h, DETOUR_OFFSET_M));
    const detours = await Promise.all(tries.map((via) => fetcher([a, via, b], false).then((r) => r[0]).catch(() => null)));
    detours.filter(Boolean).forEach((r) => candidates.push(scoreRoute({ ...r, source: 'detour' }, hazards)));
    candidates.sort((x, y) => x.duration - y.duration);
  }

  // Never accept a huge detour for a hazard: allow at most +10 min or +75% of the fastest time, whichever is larger.
  const maxDuration = fastest.duration + Math.max(600, fastest.duration * 0.75);
  const acceptable = candidates.filter((c) => c === fastest || c.duration <= maxDuration);
  const recommended = [...acceptable].sort((x, y) => x.score - y.score || x.duration - y.duration)[0];

  const keep = new Set(recommended.hazards.map((h) => h.id));
  const avoided = fastest.hazards.filter((h) => !keep.has(h.id));
  return { routes: candidates, fastest, recommended, avoided, hazards, sameRoute: recommended === fastest };
}

// ---------- formatting ----------
export function fmtDuration(sec) {
  const m = Math.max(1, Math.round(sec / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}
export const fmtDistance = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

// Evenly spaced points along a route, used to make Google Maps follow the same path.
export function sampleWaypoints(path, count = 7) {
  if (path.length <= 2) return [];
  const out = [];
  for (let k = 1; k <= count; k++) out.push(path[Math.round((k * (path.length - 1)) / (count + 1))]);
  return out;
}
