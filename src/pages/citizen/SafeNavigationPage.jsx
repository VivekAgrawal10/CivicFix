import React, { useState } from 'react';
import { 
  Navigation, 
  MapPin, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  ExternalLink, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CivicMap } from '../../components/CivicMap';
import { useCivicData } from '../../context/CivicDataContext';

export function SafeNavigationPage() {
  const { incidents, clusters, navigationPresets } = useCivicData();
  const [selectedPresetId, setSelectedPresetId] = useState('route-thapar-hospital');
  const [activeTab, setActiveTab] = useState('alternate'); // 'alternate' or 'default'

  const activePreset = navigationPresets.find(p => p.id === selectedPresetId) || navigationPresets[0];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <Navigation className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>DYNAMIC HAZARD-AWARE COMMUTER ROUTING</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Safe Navigation & Route Intelligence
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Automated rerouting around severe road hazards (&gt;3m diameter craters and waterlogging).
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            {navigationPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => setSelectedPresetId(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  selectedPresetId === preset.id
                    ? 'bg-brand-blue-light text-white'
                    : 'bg-brand-surface-elevated text-white hover:bg-brand-surface'
                }`}
              >
                {preset.id === 'route-thapar-hospital' ? 'Hospital Corridor (>3m Crater)' : 'Suburb Route (Caution)'}
              </button>
            ))}
          </div>
        </div>

        {/* Origin & Destination Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-surface border border-brand-blue-light flex items-center justify-center text-white font-bold text-xs">
              A
            </span>
            <div>
              <span className="text-[10px] text-white opacity-60 block">ORIGIN</span>
              <strong className="text-white">{activePreset.origin}</strong>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-brand-surface border border-red-500 flex items-center justify-center text-white font-bold text-xs">
              B
            </span>
            <div>
              <span className="text-[10px] text-white opacity-60 block">DESTINATION</span>
              <strong className="text-white">{activePreset.destination}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Route Evaluation Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Card 1: Direct Hazardous Path */}
        <div 
          onClick={() => setActiveTab('default')}
          className={`civic-card p-5 cursor-pointer transition-all ${
            activeTab === 'default' 
              ? 'ring-2 ring-red-500 border-red-500' 
              : 'hover:border-red-500/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-white border border-red-800">
              DIRECT PATH (HAZARDOUS)
            </span>
            <span className="text-xs font-mono font-bold text-red-400">
              Risk: {activePreset.defaultRoute.riskScore}/100
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1">
            {activePreset.defaultRoute.name}
          </h3>

          <div className="flex items-center gap-3 text-xs font-mono text-white opacity-80 mb-3">
            <span>Distance: <strong className="text-white">{activePreset.defaultRoute.distance}</strong></span>
            <span>•</span>
            <span>Est. Time: <strong className="text-white">{activePreset.defaultRoute.currentDuration}</strong></span>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-brand-border">
            <div className="text-[11px] font-bold text-white flex items-center gap-1 font-mono">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span>Corridor Hazards Encountered:</span>
            </div>
            {activePreset.defaultRoute.hazardsEncountered.map((h, i) => (
              <div key={i} className="text-[11px] p-2 rounded bg-brand-surface-elevated border border-brand-border text-white">
                <span className="font-semibold text-white">[{h.type}] {h.name}</span>
                <p className="text-[10px] text-white opacity-70 mt-0.5">{h.impact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: AI Safe Alternate Reroute */}
        <div 
          onClick={() => setActiveTab('alternate')}
          className={`civic-card p-5 cursor-pointer transition-all ${
            activeTab === 'alternate' 
              ? 'ring-2 ring-brand-blue-light border-brand-blue-light' 
              : 'hover:border-brand-blue-light/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-white border border-emerald-800">
              CIVICFIX RECOMMENDED ALTERNATE
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              Risk: {activePreset.aiReroutedRoute.riskScore}/100
            </span>
          </div>

          <h3 className="text-sm font-bold text-white mb-1">
            {activePreset.aiReroutedRoute.name}
          </h3>

          <div className="flex items-center gap-3 text-xs font-mono text-white opacity-80 mb-3">
            <span>Distance: <strong className="text-white">{activePreset.aiReroutedRoute.distance}</strong></span>
            <span>•</span>
            <span>Est. Time: <strong className="text-white">{activePreset.aiReroutedRoute.duration}</strong></span>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-brand-border">
            <div className="text-[11px] font-bold text-white flex items-center gap-1 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Safety Assessment:</span>
            </div>
            <div className="text-[11px] p-2 rounded bg-brand-surface-elevated border border-brand-border text-white">
              <p className="leading-snug text-white opacity-90">
                {activePreset.aiReroutedRoute.rerouteReason}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Map with Reroute Visual */}
      <div className="civic-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand-border">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono">
              Corridor Impact GIS Visualization
            </h3>
            <p className="text-xs text-white opacity-70">
              Dashed red path: Hazardous corridor • Solid blue path: AI safe alternate bypass.
            </p>
          </div>

          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(activePreset.origin)}&destination=${encodeURIComponent(activePreset.destination)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs px-3.5 py-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5 text-white" />
            <span>Open in Google Maps</span>
          </a>
        </div>

        <CivicMap
          incidents={incidents}
          clusters={clusters}
          navigationRoute={activePreset}
          showReroute={true}
        />
      </div>

    </div>
  );
}
