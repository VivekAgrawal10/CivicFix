import React, { useState } from 'react';
import { 
  Navigation, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  Route, 
  MapPin, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle, 
  Sparkles,
  Zap,
  Volume2,
  Share2
} from 'lucide-react';
import { NAVIGATION_PRESETS } from '../data/mockData';

export const HazardNavigation = ({ onSelectRoute, selectedPresetId }) => {
  const [activePresetId, setActivePresetId] = useState(selectedPresetId || 'route-thapar-hospital');
  const [originText, setOriginText] = useState('Thapar University East Gate');
  const [destinationText, setDestinationText] = useState('St. Jude Multi-specialty Hospital');
  const [activeRouteTab, setActiveRouteTab] = useState('alternate'); // 'alternate' or 'default'
  const [navAlertActive, setNavAlertActive] = useState(true);

  const activePreset = NAVIGATION_PRESETS.find(p => p.id === activePresetId) || NAVIGATION_PRESETS[0];

  const handleSelectPreset = (preset) => {
    setActivePresetId(preset.id);
    setOriginText(preset.origin);
    setDestinationText(preset.destination);
    if (onSelectRoute) {
      onSelectRoute(preset);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold mb-1">
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>HAZARD-AWARE INTELLIGENT COMMUTER ROUTING</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Dynamic Safety Rerouting Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Real-time ML detects road hazards &gt;3m and critical infrastructure zones, automatically steering drivers around dangerous craters.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">Presets:</span>
          {NAVIGATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activePresetId === preset.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-glow-cyan'
                  : 'bg-[#0B101D] text-slate-300 border border-white/10 hover:border-cyan-500/40'
              }`}
            >
              {preset.id === 'route-thapar-hospital' ? 'Hospital Corridor (>3m Crater)' : 'Suburb Route (Caution Only)'}
            </button>
          ))}
        </div>
      </div>

      {/* Route Query Inputs & Journey Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left: Journey Inputs */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-[#0B101D] p-4 rounded-xl border border-white/10 relative">
            <div className="absolute left-7 top-10 bottom-10 w-0.5 bg-dashed border-l border-cyan-500/40"></div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-400 flex items-center justify-center text-cyan-300 text-xs font-bold font-mono">
                  A
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                    Origin / Commuter Starting Point
                  </label>
                  <input
                    type="text"
                    value={originText}
                    onChange={(e) => setOriginText(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-rose-950 border border-rose-400 flex items-center justify-center text-rose-300 text-xs font-bold font-mono">
                  B
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                    Destination / Target Hospital or Work
                  </label>
                  <input
                    type="text"
                    value={destinationText}
                    onChange={(e) => setDestinationText(e.target.value)}
                    className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Reroute Decision Badge */}
          <div className="bg-gradient-to-r from-cyan-950/70 to-blue-950/50 border border-cyan-500/30 p-3.5 rounded-xl">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-cyan-300 font-mono">
                  AI HAZARD ENGINE DECISION:
                </div>
                <p className="text-xs text-slate-200 mt-1">
                  {activePreset.aiReroutedRoute.rerouteReason}
                </p>
                <div className="mt-2 text-[11px] font-mono text-cyan-400 flex items-center gap-2">
                  <span>Policy: Severe craters (&gt;3m) auto-reroute</span>
                  <span>•</span>
                  <span>Hospital zone priority: HIGH</span>
                </div>
              </div>
            </div>
          </div>

          {/* External Navigation Export Button */}
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originText)}&destination=${encodeURIComponent(destinationText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all shadow-md active:scale-98"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Verified Route in Google Maps Platform</span>
          </a>
        </div>

        {/* Right: Route Comparison Cards (Dangerous vs Safe Alternate) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>ROUTE EVALUATION COMPARISON</span>
            <span className="text-cyan-400">Live Traffic & Hazards Integrated</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card 1: Default Dangerous Route */}
            <div 
              onClick={() => setActiveRouteTab('default')}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                activeRouteTab === 'default'
                  ? 'bg-rose-950/40 border-rose-500 shadow-glow-danger'
                  : 'bg-[#0B101D] border-white/10 hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/40 font-bold">
                  DIRECT PATH (HAZARDOUS)
                </span>
                <span className="text-xs font-bold font-mono text-rose-400">
                  Risk: {activePreset.defaultRoute.riskScore}/100
                </span>
              </div>

              <div className="text-sm font-bold text-slate-100 mb-1">
                {activePreset.defaultRoute.name}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3 font-mono">
                <span>Dist: <strong className="text-slate-200">{activePreset.defaultRoute.distance}</strong></span>
                <span>•</span>
                <span>Est: <strong className="text-rose-400">{activePreset.defaultRoute.currentDuration}</strong></span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="text-[11px] font-semibold text-rose-300 flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Active Corridor Hazards:
                </div>
                {activePreset.defaultRoute.hazardsEncountered.map((h, i) => (
                  <div key={i} className="text-[11px] text-slate-300 bg-rose-950/30 p-1.5 rounded border border-rose-900/30">
                    <span className="font-semibold text-rose-300">[{h.type}] {h.name}</span>
                    <p className="text-[10px] text-slate-400">{h.impact}</p>
                  </div>
                ))}
                {activePreset.defaultRoute.hazardsEncountered.length === 0 && (
                  <div className="text-[11px] text-emerald-400">No high severity blocks detected.</div>
                )}
              </div>
            </div>

            {/* Card 2: AI Rerouted Safe Alternate */}
            <div 
              onClick={() => setActiveRouteTab('alternate')}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                activeRouteTab === 'alternate'
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-glow-cyan ring-1 ring-cyan-400/40'
                  : 'bg-[#0B101D] border-white/10 hover:border-cyan-500/40'
              }`}
            >
              <div className="absolute top-0 right-0 bg-cyan-400 text-slate-950 text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                CivicFix Recommended
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40 font-bold">
                  AI SAFE REROUTE
                </span>
                <span className="text-xs font-bold font-mono text-emerald-400">
                  Risk: {activePreset.aiReroutedRoute.riskScore}/100
                </span>
              </div>

              <div className="text-sm font-bold text-slate-100 mb-1">
                {activePreset.aiReroutedRoute.name}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3 font-mono">
                <span>Dist: <strong className="text-slate-200">{activePreset.aiReroutedRoute.distance}</strong></span>
                <span>•</span>
                <span>Est: <strong className="text-cyan-300 font-bold">{activePreset.aiReroutedRoute.duration}</strong></span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Corridor Safety Status:
                </div>
                <div className="text-[11px] text-slate-200 bg-emerald-950/20 p-2 rounded border border-emerald-900/30">
                  <p className="leading-snug">
                    Zero road craters detected. Smooth bypass via elevated north corridor. Protects vehicle suspension & ambulance emergency access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Audio Heads-Up Notification Simulation */}
          <div className="bg-[#0A0F1D] p-3 rounded-xl border border-cyan-500/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-mono">
              <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>HEADS-UP VOICE ALERT:</span>
              <span className="text-slate-200 font-sans hidden sm:inline">
                "Approaching Sector 14: Stay right to enter North Bypass. 3.4m road crater avoided."
              </span>
            </div>
            <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/50">
              AUDIO ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
