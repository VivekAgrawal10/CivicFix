import React, { useState } from 'react';
import { 
  Activity, 
  CloudRain, 
  Sparkles, 
  AlertTriangle, 
  Send, 
  CheckCircle2, 
  TrendingDown, 
  History,
  Droplets
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function InfrastructureAnalyticsPage() {
  const { roads, weatherAlertActive, setWeatherAlertActive, showToast } = useCivicData();
  const [selectedRoadId, setSelectedRoadId] = useState('road-b');
  const [advisorySent, setAdvisorySent] = useState(false);

  const selectedRoad = roads.find(r => r.id === selectedRoadId) || roads[0];

  const handleSendAdvisory = () => {
    setAdvisorySent(true);
    showToast(`AI Civil Engineering Advisory dispatched to ${selectedRoad.aiSuggestion?.targetCompany || 'Contractor'}`);
    setTimeout(() => setAdvisorySent(false), 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <Activity className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>CHRONIC DEGRADATION & SUBSURFACE DRAINAGE TELEMETRY</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Infrastructure Analytics & Health Scores
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Tracking recurring road craters, chronic drainage gradient failures, and monsoon flood hazards.
            </p>
          </div>

          {/* Monsoon Simulator Toggle */}
          <button
            onClick={() => setWeatherAlertActive(!weatherAlertActive)}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition-all border ${
              weatherAlertActive
                ? 'bg-amber-950 border-amber-600 text-white'
                : 'bg-brand-surface-elevated border-brand-border text-white hover:bg-brand-surface'
            }`}
          >
            <CloudRain className="w-4 h-4 text-white" />
            <span>Monsoon Weather Simulator: {weatherAlertActive ? 'ACTIVE (42mm/hr)' : 'OFF'}</span>
          </button>
        </div>

        {weatherAlertActive && (
          <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-700 text-xs text-white flex items-center gap-2 font-mono">
            <Droplets className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>MONSOON PRECIPITATION ACTIVE:</strong> Corridors with chronic drainage issues (e.g. Sector 14 Link Road) flagged as "Logging-Prone Area" across GIS.
            </span>
          </div>
        )}
      </div>

      {/* Grid: Road Health Scorecards + Chronic AI Suggestion Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Road Health Scorecards (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-mono text-white opacity-75 uppercase font-bold block">
            Corridor Road Health Scores (0-100):
          </span>

          {roads.map((road) => {
            const isSelected = road.id === selectedRoadId;
            let scoreColor = 'text-emerald-400';
            if (road.healthScore < 50) scoreColor = 'text-red-400';
            else if (road.healthScore < 70) scoreColor = 'text-amber-400';

            return (
              <div
                key={road.id}
                onClick={() => setSelectedRoadId(road.id)}
                className={`civic-card p-4 cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-brand-blue-light border-brand-blue-light' : 'hover:border-brand-blue-light/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h3 className="text-sm font-bold text-white">{road.name}</h3>
                    <span className="text-[10px] font-mono text-white opacity-60">{road.code}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-mono font-extrabold ${scoreColor}`}>
                      {road.healthScore}
                      <span className="text-xs text-white opacity-60">/100</span>
                    </span>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="w-full bg-brand-surface-elevated h-2 rounded-full overflow-hidden border border-brand-border my-2">
                  <div 
                    className={`h-full ${road.healthScore < 50 ? 'bg-red-500' : road.healthScore < 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${road.healthScore}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-white opacity-80 pt-1">
                  <div>Potholes: <strong className="text-white">{road.potholesPerMonth}/mo</strong></div>
                  <div>Drain Failures: <strong className="text-white">{road.drainageIssuesPerMonth}/mo</strong></div>
                </div>

                {weatherAlertActive && road.waterloggingProne && (
                  <div className="mt-2 text-[10px] font-mono text-white p-1 rounded bg-amber-950 border border-amber-800">
                    ⚠ LOGGING-PRONE CORRIDOR IN MONSOON
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed AI Root Cause & Chronic Drainage Diagnosis (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="civic-card p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div>
                <span className="text-xs font-mono text-white opacity-60 uppercase">Telemetry Analysis</span>
                <h2 className="text-base font-bold text-white mt-0.5">{selectedRoad.name}</h2>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-brand-surface-elevated border border-brand-border text-white">
                SCORE: {selectedRoad.healthScore}/100
              </span>
            </div>

            {/* AI Root Cause Suggestion Box (The User's Feature!) */}
            {selectedRoad.aiSuggestion ? (
              <div className="p-4 rounded-xl bg-brand-surface-elevated border border-brand-border space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-bold">
                  <Sparkles className="w-4 h-4 text-brand-blue-light" />
                  <span>AI CHRONIC ROOT CAUSE DISCOVERY ({selectedRoad.aiSuggestion.confidence}% Confidence)</span>
                </div>

                <h3 className="text-sm font-bold text-white">{selectedRoad.aiSuggestion.title}</h3>
                
                <p className="text-xs text-white opacity-85 leading-relaxed">
                  {selectedRoad.aiSuggestion.analysis}
                </p>

                <div className="p-3 rounded bg-brand-surface border border-brand-border text-xs font-mono space-y-1">
                  <span className="text-amber-400 font-bold block text-[11px]">RECOMMENDED CIVIL ACTION:</span>
                  <p className="text-white">{selectedRoad.aiSuggestion.recommendation}</p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] font-mono text-white opacity-70">
                    Target: <strong className="text-white">{selectedRoad.aiSuggestion.targetCompany}</strong>
                  </span>

                  <button
                    onClick={handleSendAdvisory}
                    disabled={advisorySent}
                    className="btn-primary text-xs font-semibold px-4 py-2"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>{advisorySent ? 'Advisory Dispatched to Contractor' : 'Dispatch Engineering Advisory'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded bg-brand-surface-elevated border border-brand-border text-xs text-white opacity-80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Corridor maintains high road durability. No chronic subsurface drainage anomaly detected.</span>
              </div>
            )}

            {/* 90-Day Incident History Chronology */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-mono font-bold text-white uppercase block">
                90-Day Incident Chronology:
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                {selectedRoad.history.map((h, i) => (
                  <div key={i} className="p-2.5 rounded bg-brand-surface-elevated border border-brand-border flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white opacity-60">{h.date}</span>
                      <strong className="text-white">[{h.type}]</strong>
                      <span className="text-white opacity-80">{h.note}</span>
                    </div>
                    <span className="text-[10px] text-white opacity-60">Verified</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
