import React, { useState } from 'react';
import { 
  Activity, 
  CloudRain, 
  AlertTriangle, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  TrendingUp, 
  History, 
  ShieldAlert, 
  ArrowUpRight,
  Droplets,
  Calendar
} from 'lucide-react';
import { INITIAL_ROADS, LIVE_WEATHER_FEED } from '../data/mockData';

export const RoadHealthAndWeather = ({ 
  weatherAlertActive, 
  setWeatherAlertActive,
  onNotifyContractor 
}) => {
  const [selectedRoadId, setSelectedRoadId] = useState('road-b');
  const [notified, setNotified] = useState(false);

  const selectedRoad = INITIAL_ROADS.find(r => r.id === selectedRoadId) || INITIAL_ROADS[0];

  const handleTransmitDiagnosis = () => {
    setNotified(true);
    if (onNotifyContractor) {
      onNotifyContractor(selectedRoad.aiSuggestion);
    }
    setTimeout(() => setNotified(false), 3500);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>ROAD HEALTH SCORECARD & CHRONIC HAZARD PREDICTOR</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Infrastructure Health & Weather Telemetry
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            AI tracks chronic recurring failures, calculates road health scores, and predicts monsoon waterlogging based on corridor gradient history.
          </p>
        </div>

        {/* Live Weather Simulation Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeatherAlertActive(!weatherAlertActive)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold font-mono transition-all border ${
              weatherAlertActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-glow-amber'
                : 'bg-[#0B101D] text-slate-300 border-white/10 hover:border-amber-400/40'
            }`}
          >
            <CloudRain className="w-4 h-4 text-amber-400" />
            <span>Monsoon Simulator: {weatherAlertActive ? 'ACTIVE (42mm Rain)' : 'DRY WEATHER'}</span>
          </button>
        </div>
      </div>

      {/* Weather Feed Banner */}
      <div className={`p-4 rounded-xl border transition-all ${
        weatherAlertActive
          ? 'bg-gradient-to-r from-amber-950/40 via-blue-950/30 to-[#0B101D] border-amber-500/30'
          : 'bg-[#0B101D] border-white/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <CloudRain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Live Meteorological Sensor: {LIVE_WEATHER_FEED.city}
                </span>
                {weatherAlertActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold uppercase">
                    Alert Level High
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {weatherAlertActive ? LIVE_WEATHER_FEED.alertHeadline : 'Clear sky telemetry • Normal runoff conditions'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-300 bg-[#070A10] px-4 py-2 rounded-xl border border-white/10">
            <div>
              <span className="text-slate-500 block text-[10px]">Precipitation:</span>
              <strong className="text-cyan-400">{weatherAlertActive ? '42 mm/hr' : '0.2 mm/hr'}</strong>
            </div>
            <div className="border-l border-white/10 pl-3">
              <span className="text-slate-500 block text-[10px]">Waterlogging Risk:</span>
              <strong className={weatherAlertActive ? 'text-amber-400' : 'text-emerald-400'}>
                {weatherAlertActive ? '86% CRITICAL' : '6% MINIMAL'}
              </strong>
            </div>
            <div className="border-l border-white/10 pl-3 hidden sm:block">
              <span className="text-slate-500 block text-[10px]">Temp:</span>
              <strong className="text-slate-200">{LIVE_WEATHER_FEED.temperature}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Road Health Cards + Deep AI Chronic Root Cause Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Corridor Health Scorecards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>CITY ROAD HEALTH SCORECARDS</span>
            <span>Scale: 0-100</span>
          </div>

          {INITIAL_ROADS.map((road) => {
            const isSelected = road.id === selectedRoadId;
            let scoreColor = 'text-emerald-400';
            let barColor = 'bg-emerald-500';
            let badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800/40';

            if (road.healthScore < 50) {
              scoreColor = 'text-rose-400';
              barColor = 'bg-rose-500';
              badgeStyle = 'bg-rose-950 text-rose-300 border-rose-800/40';
            } else if (road.healthScore < 70) {
              scoreColor = 'text-amber-400';
              barColor = 'bg-amber-500';
              badgeStyle = 'bg-amber-950 text-amber-300 border-amber-800/40';
            }

            return (
              <div
                key={road.id}
                onClick={() => setSelectedRoadId(road.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-950/40 to-[#0F172A] border-cyan-400 shadow-glow-cyan'
                    : 'bg-[#0B101D] border-white/10 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100">{road.name}</h4>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{road.code}</span>
                  </div>

                  {/* Health Score Pill */}
                  <div className="text-right">
                    <span className={`text-xl font-extrabold font-mono ${scoreColor}`}>
                      {road.healthScore}
                      <span className="text-xs text-slate-500">/100</span>
                    </span>
                  </div>
                </div>

                {/* Road Health Score Progress Bar */}
                <div className="w-full bg-[#1A253F] h-1.5 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full ${barColor} transition-all duration-700`}
                    style={{ width: `${road.healthScore}%` }}
                  ></div>
                </div>

                {/* Sub Metrics */}
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1">
                    <span>Potholes:</span>
                    <strong className="text-slate-200">{road.potholesPerMonth}/mo</strong>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Drainage Failures:</span>
                    <strong className="text-slate-200">{road.drainageIssuesPerMonth}/mo</strong>
                  </div>
                </div>

                {/* Weather Logging-Prone Tag */}
                {weatherAlertActive && road.waterloggingProne && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono bg-amber-950/70 border border-amber-500/50 text-amber-300 px-2 py-1 rounded">
                    <Droplets className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>LOGGING-PRONE CORRIDOR IN MONSOON</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: AI Root Cause Diagnostics & Historical Log */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0B101D] p-5 rounded-xl border border-white/10 space-y-4">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-xs font-mono text-slate-400">CORRIDOR TELEMETRY:</span>
                <h3 className="text-base font-bold text-white">{selectedRoad.name}</h3>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                selectedRoad.healthScore < 50 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-emerald-950 text-emerald-300'
              }`}>
                HEALTH SCORE: {selectedRoad.healthScore}/100
              </span>
            </div>

            {/* AI Suggestion Box (The User's Feature!) */}
            {selectedRoad.aiSuggestion ? (
              <div className="bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-[#0A0E1A] border border-purple-500/40 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-purple-500 text-slate-950 text-[9px] font-mono font-bold rounded-bl-lg">
                  AI ROOT CAUSE DISCOVERY
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold font-mono text-purple-300 uppercase tracking-wide">
                    {selectedRoad.aiSuggestion.title}
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/40">
                    {selectedRoad.aiSuggestion.confidence}% Confidence
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 font-sans">
                  <p>
                    <strong className="text-slate-100">Historical Pattern:</strong> {selectedRoad.aiSuggestion.analysis}
                  </p>
                  
                  <div className="p-2.5 rounded-lg bg-black/40 border border-purple-500/20 text-[11px] font-mono text-purple-200">
                    <span className="text-amber-400 font-bold block mb-1">RECOMMENDED CIVIL REMEDY:</span>
                    {selectedRoad.aiSuggestion.recommendation}
                  </div>
                </div>

                {/* Transmit to Repair Contractor Button */}
                <div className="mt-4 pt-3 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[11px] font-mono text-slate-400">
                    Target Contractor: <strong className="text-white">{selectedRoad.aiSuggestion.targetCompany}</strong>
                  </span>

                  <button
                    onClick={handleTransmitDiagnosis}
                    disabled={notified}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                      notified
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-glow-cyan'
                    }`}
                  >
                    {notified ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Dispatched to Contractor Work Order</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Engineering Advisory to Repair Co.</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs text-slate-300 flex items-center gap-3 font-mono">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Corridor maintains high durability. No chronic subsurface drainage anomaly detected.</span>
              </div>
            )}

            {/* Corridor Historical Log */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-cyan-400" />
                  INCIDENT & REPAIR CHRONOLOGY
                </span>
                <span>Last 90 Days</span>
              </div>

              <div className="space-y-2">
                {selectedRoad.history.map((h, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#070A10] border border-white/5 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px]">{h.date}</span>
                      <span className="font-semibold text-cyan-300">[{h.type}]</span>
                      <span className="text-slate-300 font-sans hidden sm:inline">{h.note}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Logged</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
