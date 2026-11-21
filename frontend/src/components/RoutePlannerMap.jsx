import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, TILE_MAX_ZOOM, DEFAULT_CENTER } from '../config/map';
import { isRoadHazard } from '../utils/routing';

const pin = (letter, color) => L.divIcon({
  className: 'civic-pin',
  html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 13px sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.5)">${letter}</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});
const iconA = pin('A', '#2563EB');
const iconB = pin('B', '#DC2626');

function ClickToPick({ mode, onPick }) {
  const map = useMap();
  useEffect(() => { map.getContainer().style.cursor = mode ? 'crosshair' : ''; return () => { map.getContainer().style.cursor = ''; }; }, [mode, map]);
  useMapEvents({ click: (e) => { if (mode) onPick(mode, e.latlng.lat, e.latlng.lng); } });
  return null;
}

function Fit({ plan, origin, dest }) {
  const map = useMap();
  useEffect(() => {
    if (plan) {
      const pts = [...plan.fastest.path, ...plan.recommended.path];
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    } else if (origin && dest) {
      map.fitBounds(L.latLngBounds([[origin.lat, origin.lng], [dest.lat, dest.lng]]), { padding: [60, 60], maxZoom: 16 });
    } else if (origin || dest) {
      const p = origin || dest;
      map.setView([p.lat, p.lng], 15);
    }
  }, [plan, origin, dest, map]);
  return null;
}

/**
 * Props: origin/dest {lat,lng}|null, plan (from planRoute)|null, incidents[], pickMode 'origin'|'dest'|null,
 *        onPick(mode, lat, lng), onDrag(mode, lat, lng)
 */
export function RoutePlannerMap({ origin, dest, plan, incidents, pickMode, onPick, onDrag }) {
  const hazards = incidents.filter(isRoadHazard);
  const onFastest = new Set(plan ? plan.fastest.hazards.map((h) => h.id) : []);
  const onRecommended = new Set(plan ? plan.recommended.hazards.map((h) => h.id) : []);
  const others = plan ? plan.routes.filter((r) => r !== plan.fastest && r !== plan.recommended) : [];
  const fastestHasHazard = plan && plan.fastest.score > 0;

  return (
    <div className="relative h-[520px] rounded-2xl overflow-hidden border border-brand-border">
      <MapContainer center={DEFAULT_CENTER} zoom={13} style={{ width: '100%', height: '100%' }}>
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
        <ClickToPick mode={pickMode} onPick={onPick} />
        <Fit plan={plan} origin={origin} dest={dest} />

        {others.map((r, i) => <Polyline key={`o${i}`} positions={r.path} pathOptions={{ color: '#94A3B8', weight: 3, opacity: 0.6 }} />)}

        {plan && !plan.sameRoute && (
          <Polyline positions={plan.fastest.path} pathOptions={{ color: fastestHasHazard ? '#EF4444' : '#3B82F6', weight: 5, opacity: 0.8, dashArray: '9, 9' }} />
        )}
        {plan && (
          <Polyline positions={plan.recommended.path} pathOptions={{ color: plan.recommended.score > 0 ? '#F59E0B' : '#16A34A', weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
        )}

        {hazards.map((h) => {
          const hitFast = onFastest.has(h.id), hitRec = onRecommended.has(h.id);
          return (
            <CircleMarker
              key={h.id}
              center={[h.lat, h.lng]}
              radius={hitFast || hitRec ? 9 : 6}
              pathOptions={{ color: '#fff', weight: 2, fillColor: hitRec ? '#F59E0B' : hitFast ? '#DC2626' : '#64748B', fillOpacity: 0.95 }}
            >
              <Popup>
                <div className="text-xs">
                  <strong>{h.title}</strong>
                  <div>{h.category} · {h.aiData.severity}</div>
                  {hitFast && !hitRec && <div style={{ color: '#B91C1C' }}>On the fastest route, avoided by the recommended one</div>}
                  {hitRec && <div style={{ color: '#B45309' }}>On the recommended route</div>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {origin && <Marker position={[origin.lat, origin.lng]} icon={iconA} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onDrag('origin', p.lat, p.lng); } }} />}
        {dest && <Marker position={[dest.lat, dest.lng]} icon={iconB} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); onDrag('dest', p.lat, p.lng); } }} />}
      </MapContainer>

      {pickMode && (
        <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none z-[1000]">
          <span className="text-xs px-3 py-1.5 rounded-full bg-black/75 text-white">Tap the map to set point {pickMode === 'origin' ? 'A (start)' : 'B (destination)'}</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-[1000] glass-panel px-3 py-2 rounded-xl flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-brand-text pointer-events-none">
        <span className="flex items-center gap-1.5"><span className="w-4 h-1 rounded bg-green-600" />Recommended</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0 border-t-2 border-dashed border-red-500" />Fastest (has hazard)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600" />Hazard on fastest route</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" />Other reported hazard</span>
      </div>
    </div>
  );
}
