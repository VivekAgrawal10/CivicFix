// Pure helpers for the live-map layers (no React / Leaflet imports, so they can be unit-tested with Node).

const SEVERITY_WEIGHT = { critical: 1, high: 0.7, medium: 0.45, low: 0.3 };
export const severityWeight = (inc) => SEVERITY_WEIGHT[String(inc.aiData && inc.aiData.severity).toLowerCase()] || 0.4;
export const severityRank = (inc) => ({ critical: 4, high: 3, medium: 2, low: 1 }[String(inc.aiData && inc.aiData.severity).toLowerCase()] || 1);

// Greedy clustering by on-screen distance. `project(lat, lng)` must return pixel {x, y} at the current zoom.
// Returns [{ items, lat, lng, maxRank }]; a cluster with one item is just a single report.
export function clusterPoints(incidents, project, radiusPx = 55) {
  const sorted = [...incidents].sort((a, b) => severityRank(b) - severityRank(a));
  const clusters = [];
  for (const inc of sorted) {
    const p = project(inc.lat, inc.lng);
    let home = null;
    for (const c of clusters) {
      if (Math.hypot(c.px - p.x, c.py - p.y) <= radiusPx) { home = c; break; }
    }
    if (!home) {
      clusters.push({ items: [inc], px: p.x, py: p.y, lat: inc.lat, lng: inc.lng, maxRank: severityRank(inc) });
    } else {
      const n = home.items.length;
      home.items.push(inc);
      home.px = (home.px * n + p.x) / (n + 1);
      home.py = (home.py * n + p.y) / (n + 1);
      home.lat = (home.lat * n + inc.lat) / (n + 1);
      home.lng = (home.lng * n + inc.lng) / (n + 1);
      home.maxRank = Math.max(home.maxRank, severityRank(inc));
    }
  }
  return clusters;
}
