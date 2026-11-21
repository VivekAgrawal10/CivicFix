import { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

// Small dependency-free canvas heat map. Every point is a soft radial blob (alpha = its weight);
// overlapping blobs add up, and the accumulated alpha is then mapped to a green -> yellow -> orange -> red palette.
const PALETTE = (() => {
  const c = document.createElement('canvas');
  c.width = 1; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, 'rgba(34,197,94,0)');
  grad.addColorStop(0.2, 'rgb(34,197,94)');
  grad.addColorStop(0.45, 'rgb(250,204,21)');
  grad.addColorStop(0.7, 'rgb(249,115,22)');
  grad.addColorStop(1.0, 'rgb(220,38,38)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1, 256);
  return g.getImageData(0, 0, 1, 256).data;
})();

const HeatCanvas = L.Layer.extend({
  initialize(points) { this._points = points; },
  onAdd(map) {
    this._map = map;
    const canvas = (this._canvas = L.DomUtil.create('canvas', 'leaflet-heat-layer leaflet-zoom-hide'));
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.85';
    map.getPanes().overlayPane.appendChild(canvas);
    map.on('moveend resize', this._reset, this);
    this._reset();
  },
  onRemove(map) {
    map.off('moveend resize', this._reset, this);
    L.DomUtil.remove(this._canvas);
  },
  _reset() {
    const map = this._map, canvas = this._canvas;
    const size = map.getSize();
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
    canvas.width = size.x;
    canvas.height = size.y;
    this._draw();
  },
  _draw() {
    const map = this._map, canvas = this._canvas, ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this._points.length) return;
    // blob radius ~150 m on the ground, kept between 22 and 70 px so it stays readable at every zoom
    const metersPerPx = (156543.03392 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
    const r = Math.max(22, Math.min(70, 150 / metersPerPx));
    for (const p of this._points) {
      const pt = map.latLngToContainerPoint([p.lat, p.lng]);
      if (pt.x < -r || pt.y < -r || pt.x > canvas.width + r || pt.y > canvas.height + r) continue;
      const g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      const a = Math.min(1, 0.22 + p.weight * 0.35);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
    }
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i];
      if (!a) continue;
      const k = Math.min(255, Math.round(a * 1.6)) * 4;
      d[i - 3] = PALETTE[k]; d[i - 2] = PALETTE[k + 1]; d[i - 1] = PALETTE[k + 2]; d[i] = Math.max(60, PALETTE[k + 3]);
    }
    ctx.putImageData(img, 0, 0);
  },
});

/** points: [{ lat, lng, weight }] (weight 0..1). Keep the array stable (useMemo) so the layer is not rebuilt on every render. */
export function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    const layer = new HeatCanvas(points);
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
}
