import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
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
  weatherAlertActive = false
}) => {
  const [mapCenter, setMapCenter] = useState([30.3540, 76.3685]);
  const [mapZoom, setMapZoom] = useState(14);
  const [layerMode, setLayerMode] = useState('all'); // 'all', 'critical', 'clusters'

  useEffect(() => {
    if (selectedIncident) {
      setMapCenter([selectedIncident.lat, selectedIncident.lng]);
      setMapZoom(16);
    }
  }, [selectedIncident]);

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#070A10]">
      {/* Top Map HUD Controls */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>CIVIC GIS ENGINE</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400 font-semibold">{incidents.length} HAZARDS</span>
        </div>

        {weatherAlertActive && (
          <div className="glass-panel px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono bg-amber-950/60 border-amber-500/40 text-amber-300">
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
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Layers
        </button>
        <button
          onClick={() => setLayerMode('critical')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            layerMode === 'critical'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Critical Only
        </button>
        <button
          onClick={() => setLayerMode('clusters')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
            layerMode === 'clusters'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Clusters
        </button>
      </div>

      {/* Actual Leaflet Map Instance */}
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%', background: '#070A10' }}
        zoomControl={false}
      >
        <MapRecenter center={mapCenter} zoom={mapZoom} />

        {/* CartoDB Dark Matter High-Tech Midnight Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Sensitive Infrastructure Buffers (Hospitals & Schools) */}
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

        {/* Render Incidents Markers */}
        {incidents
          .filter((inc) => {
            if (layerMode === 'critical') return inc.aiData.severity === 'CRITICAL';
            return true;
          })
          .map((incident) => (
            <Marker
              key={incident.id}
              position={[incident.lat, incident.lng]}
              icon={createHazardMarker(incident.aiData.severity, incident.category)}
              eventHandlers={{
                click: () => onSelectIncident && onSelectIncident(incident)
              }}
            >
              <Popup>
                <div className="p-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/40">
                      {incident.id}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      incident.aiData.severity === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                    }`}>
                      {incident.aiData.severity}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1">
                    {incident.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2 mb-2">
                    {incident.description}
                  </p>

                  <div className="bg-[#090E17] p-2 rounded-lg border border-white/5 space-y-1 text-[10px] font-mono mb-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Est. Diameter:</span>
                      <strong className="text-cyan-300">
                        {incident.aiData.estimatedDiameterMeters ? `${incident.aiData.estimatedDiameterMeters}m` : 'N/A'}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>AI Confidence:</span>
                      <strong className="text-emerald-400">{incident.aiData.confidence}%</strong>
                    </div>
                    {incident.isRural && (
                      <div className="text-amber-300 font-semibold">
                        🌾 Single-Citizen Rural Verified
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectIncident && onSelectIncident(incident)}
                    className="w-full py-1 text-center bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded border border-cyan-500/40 text-[11px] font-semibold transition-all"
                  >
                    View Full Telemetry & Fix
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

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
                  <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs font-bold mb-1">
                    <Truck className="w-4 h-4" />
                    <span>{cluster.assignedTeam.teamName}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-1">
                    Assigned Mission: <strong>{cluster.id}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Status: <strong className="text-emerald-400">En Route (ETA {cluster.assignedTeam.etaMinutes}m)</strong>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] glass-panel px-3 py-2 rounded-xl flex items-center gap-4 text-[11px] font-mono text-slate-300 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-glow-danger"></span>
          <span>Critical Hazard (&gt;3m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Caution / High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Verified Fix</span>
        </div>
        <div className="flex items-center gap-1.5 hidden sm:flex">
          <span className="w-4 h-1 bg-cyan-400 rounded"></span>
          <span>Safe Alternate Route</span>
        </div>
      </div>
    </div>
  );
};
