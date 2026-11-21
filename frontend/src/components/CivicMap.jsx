import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, TILE_MAX_ZOOM, DEFAULT_CENTER } from '../config/map';
import { HeatLayer } from './HeatLayer';
import { clusterPoints, severityWeight } from '../utils/mapGeo';
import { 
  createHazardMarker, 
  createClusterMarker, 
  createTruckMarker 
} from '../utils/mapIcons';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Navigation, 
  Maximize2, 
  Layers, 
  Sparkles,
  Truck,
  Eye,
  Crosshair
} from 'lucide-react';

// Controller component to smoothly reposition map when active incident or route changes
// Zoom the map so every report is visible (runs when the set of reports changes)
function FitBounds({ incidents, enabled }) {
  const map = useMap();
  const key = incidents.map((i) => i.id).join('|');
  useEffect(() => {
    if (!enabled || !incidents.length) return;
    const pts = incidents.filter((i) => i.lat || i.lng).map((i) => [i.lat, i.lng]);
    if (pts.length === 1) map.setView(pts[0], 16);
    else if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 17 });
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function LocateMeButton() {
  const map = useMap();
  const go = () => map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: 60 }}>
      <div className="leaflet-control">
        <button type="button" onClick={go} className="glass-panel px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-brand-text flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5" /> My location
        </button>
      </div>
    </div>
  );
}

const CLUSTER_COLOR = { 4: '#DC2626', 3: '#F97316', 2: '#F59E0B', 1: '#22C55E' };
const clusterIcon = (count, maxRank) => {
  const size = 34 + Math.min(26, count * 3);
  return L.divIcon({
    className: 'civic-cluster',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${CLUSTER_COLOR[maxRank] || '#F59E0B'};color:#fff;border:3px solid rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font:700 14px sans-serif">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Groups nearby reports into numbered circles; zooming in (or tapping a circle) splits them up again.
function ClusterLayer({ incidents, renderSingle }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const groups = useMemo(
    () => (zoom >= 18 ? incidents.map((i) => ({ items: [i] })) : clusterPoints(incidents, (lat, lng) => map.project([lat, lng], zoom), 55)),
    [incidents, zoom, map]
  );
  return groups.map((g) => (g.items.length === 1
    ? renderSingle(g.items[0])
    : (
      <Marker
        key={`cluster-${g.items.map((i) => i.id).join('-')}`}
        position={[g.lat, g.lng]}
        icon={clusterIcon(g.items.length, g.maxRank)}
        eventHandlers={{ click: () => map.flyTo([g.lat, g.lng], Math.min(map.getZoom() + 2, TILE_MAX_ZOOM), { duration: 0.6 }) }}
      />
    )));
}

function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 14, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map]);
  return null;
}

export const CivicMap = ({ 
  incidents = [], 
  clusters = [], 
  selectedIncident, 
  onSelectIncident,
  navigationRoute,
  showReroute = true,
  weatherAlertActive = false,
  showSensitiveZones = true,   // demo school/hospital buffer; the live map turns it off
  fitToIncidents = false,      // live map: zoom to show every report
  showLocateMe = false
}) => {
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(14);
  const [layerMode, setLayerMode] = useState('all'); // 'all', 'critical', 'clusters', 'heat'

  useEffect(() => {
    if (selectedIncident) {
      setMapCenter([selectedIncident.lat, selectedIncident.lng]);
      setMapZoom(16);
    }
  }, [selectedIncident]);

  const visibleIncidents = incidents.filter((inc) => (layerMode === 'critical' ? String(inc.aiData.severity).toUpperCase() === 'CRITICAL' : true));

  // Heat map input: only problems that are still open (fixed ones are not "hot" any more)
  const heatKey = incidents.map((i) => `${i.id}:${i.status}:${i.aiData.severity}`).join('|');
  const heatPoints = useMemo(
    () => incidents.filter((i) => i.status !== 'Completed' && (i.lat || i.lng)).map((i) => ({ lat: i.lat, lng: i.lng, weight: severityWeight(i) })),
    [heatKey] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const renderMarker = (incident) => (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={createHazardMarker(incident.status === 'Completed' ? 'RESOLVED' : String(incident.aiData.severity).toUpperCase(), incident.category)}
              eventHandlers={{
                click: () => onSelectIncident && onSelectIncident(incident)
              }}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-canvas font-semibold border border-brand-border">
                      {incident.id}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      String(incident.aiData.severity).toUpperCase() === 'CRITICAL'
                        ? 'bg-brand-canvas border border-hazard-critical'
                        : 'bg-brand-canvas border border-hazard-warning'
                    }`}>
                      {incident.aiData.severity}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold mb-1">
                    {incident.title}
                  </h4>
                  <p className="text-[11px] text-brand-text line-clamp-2 mb-2">
                    {incident.description}
                  </p>

                  <div className="bg-brand-canvas p-2 rounded-lg border border-brand-border space-y-1 text-[10px] font-mono mb-2">
                    <div className="flex justify-between text-brand-text opacity-70">
                      <span>Status:</span>
                      <strong className="font-bold">{incident.status}</strong>
                    </div>
                    <div className="flex justify-between text-brand-text opacity-70">
                      <span>Reported:</span>
                      <strong className="text-brand-text">{incident.reportedAt}</strong>
                    </div>
                    {incident.aiData.estimatedDiameterMeters ? (
                      <div className="flex justify-between text-brand-text opacity-70">
                        <span>Est. Diameter:</span>
                        <strong className="font-bold">{incident.aiData.estimatedDiameterMeters}m</strong>
                      </div>
                    ) : null}
                    {incident.aiData.confidence != null ? (
                      <div className="flex justify-between text-brand-text opacity-70">
                        <span>AI Confidence:</span>
                        <strong className="font-bold">{incident.aiData.confidence}%</strong>
                      </div>
                    ) : null}
                    {incident.isRural && (
                      <div className="text-amber-300 font-semibold">
                        🌾 Single-Citizen Rural Verified
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectIncident && onSelectIncident(incident)}
                    className="w-full py-1 text-center bg-brand-primary hover:opacity-90 text-brand-primary-text rounded border border-brand-border text-[11px] font-semibold transition-all"
                  >
                    View details
                  </button>
                </div>
              </Popup>
            </Marker>
  );

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-brand-border shadow-card bg-brand-canvas">
      {/* Top Map HUD Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono text-brand-text">
          <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></span>
          <span>LIVE MAP</span>
          <span className="text-brand-text opacity-70">|</span>
          <span className="text-brand-text font-semibold">{incidents.length} REPORTS</span>
        </div>

        {weatherAlertActive && (
          <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono bg-amber-100 border-amber-500/60 text-amber-900">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            MONSOON FLOOD ZONE OVERLAY ACTIVE
          </div>
        )}
      </div>

      {/* Layer Filter Buttons */}
      <div className="absolute top-3 right-3 z-[1000] glass-panel p-1 rounded-xl flex items-center gap-1 pointer-events-auto text-xs">
        <button
          onClick={() => setLayerMode('all')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            layerMode === 'all'
              ? 'bg-brand-primary text-brand-primary-text border border-brand-border'
              : 'text-brand-text opacity-70 hover:opacity-100'
          }`}
        >
          All Layers
        </button>
        <button
          onClick={() => setLayerMode('critical')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            layerMode === 'critical'
              ? 'bg-brand-primary text-brand-primary-text border border-brand-border'
              : 'text-brand-text opacity-70 hover:opacity-100'
          }`}
        >
          Critical Only
        </button>
        <button
          onClick={() => setLayerMode('clusters')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            layerMode === 'clusters'
              ? 'bg-brand-primary text-brand-primary-text border border-brand-border'
              : 'text-brand-text opacity-70 hover:opacity-100'
          }`}
        >
          Clusters
        </button>
        <button
          onClick={() => setLayerMode('heat')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            layerMode === 'heat'
              ? 'bg-brand-primary text-brand-primary-text border border-brand-border'
              : 'text-brand-text opacity-70 hover:opacity-100'
          }`}
        >
          Heat Map
        </button>
      </div>

      {/* Actual Leaflet Map Instance */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
      >
        <MapRecenter center={mapCenter} zoom={mapZoom} />
        <FitBounds incidents={incidents} enabled={fitToIncidents && !selectedIncident} />
        {showLocateMe && <LocateMeButton />}

        {/* Leaflet tiles: OpenStreetMap by default (no API key), or the provider set in frontend/.env */}
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />

        {/* Sensitive Infrastructure Buffers (Hospitals & Schools) */}
        {showSensitiveZones && (
          <Circle
            center={[30.3510, 76.3740]}
            radius={260}
            pathOptions={{
              color: '#3B82F6',
              fillColor: '#3B82F6',
              fillOpacity: 0.12,
              weight: 1,
              dashArray: '4, 4'
            }}
          />
        )}

        {/* Monsoon High Risk Waterlogging Zone Buffer */}
        {weatherAlertActive && (
          <Circle
            center={[30.3540, 76.3685]}
            radius={350}
            pathOptions={{
              color: '#F59E0B',
              fillColor: '#F59E0B',
              fillOpacity: 0.15,
              weight: 1.5,
              dashArray: '6, 6'
            }}
          />
        )}

        {/* Navigation Routes Visualization (Slide 04 - Hazard-Aware Navigation) */}
        {navigationRoute && (
          <>
            {/* Original Dangerous Route (Passing through hazards) */}
            <Polyline
              positions={navigationRoute.defaultRoute.pathCoordinates}
              pathOptions={{
                color: '#EF4444',
                weight: 4,
                opacity: 0.75,
                dashArray: '8, 8'
              }}
            />

            {/* AI Suggested Rerouted Safe Alternate */}
            {showReroute && navigationRoute.aiReroutedRoute && (
              <Polyline
                positions={navigationRoute.aiReroutedRoute.pathCoordinates}
                pathOptions={{
                  color: '#00F2FE',
                  weight: 5,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            )}
          </>
        )}

        {/* Report layers: markers, clusters or heat map */}
        {(layerMode === 'all' || layerMode === 'critical') && visibleIncidents.map(renderMarker)}
        {layerMode === 'clusters' && <ClusterLayer incidents={visibleIncidents} renderSingle={renderMarker} />}
        {layerMode === 'heat' && (
          <>
            <HeatLayer points={heatPoints} />
            {incidents.map((inc) => (
              <CircleMarker
                key={`dot-${inc.id}`}
                center={[inc.lat, inc.lng]}
                radius={4}
                pane="markerPane"
                pathOptions={{ color: '#fff', weight: 1, fillColor: '#111827', fillOpacity: 0.7 }}
                eventHandlers={{ click: () => onSelectIncident && onSelectIncident(inc) }}
              />
            ))}
          </>
        )}

        {/* Render Repair Team Truck Location */}
        {clusters.map((cluster) => {
          if (!cluster.assignedTeam) return null;
          return (
            <Marker
              key={`truck-${cluster.id}`}
              position={[30.3555, 76.3650]}
              icon={createTruckMarker(cluster.assignedTeam.truckId)}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-1.5 font-bold font-mono text-xs font-bold mb-1">
                    <Truck className="w-4 h-4" />
                    <span>{cluster.assignedTeam.teamName}</span>
                  </div>
                  <p className="text-[11px] text-brand-text mb-1">
                    Assigned Mission: <strong>{cluster.id}</strong>
                  </p>
                  <p className="text-[10px] text-brand-text opacity-70 font-mono">
                    Status: <strong className="font-bold">En Route (ETA {cluster.assignedTeam.etaMinutes}m)</strong>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] glass-panel px-3 py-2 rounded-xl flex items-center gap-4 text-[11px] font-mono text-brand-text pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-glow-danger"></span>
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>High / Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Fixed</span>
        </div>
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <span className="w-4 h-1 bg-cyan-400 rounded"></span>
          <span>Safe Alternate Route</span>
        </div>
        {layerMode === 'heat' && (
          <div className="flex items-center gap-1.5">
            <span>Fewer problems</span>
            <span className="w-20 h-2 rounded" style={{ background: 'linear-gradient(90deg,#22C55E,#FACC15,#F97316,#DC2626)' }}></span>
            <span>More</span>
          </div>
        )}
      </div>
    </div>
  );
};
