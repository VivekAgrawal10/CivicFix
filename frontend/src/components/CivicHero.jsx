import React from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  Route, 
  Layers, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Building2,
  TreePine,
  CloudRain
} from 'lucide-react';

export const CivicHero = ({ 
  onTriggerScenario, 
  activeScenario, 
  onOpenReportModal,
  onNavigateTab
}) => {
  return (
    <div className="relative overflow-hidden pt-8 pb-10 border-b border-white/5 bg-gradient-to-b from-[#090F1C] to-[#070A10]">
      {/* Background Subtle Cyber Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          
          {/* Main Title & Value Proposition */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              SATHACK THAPAR • NEXT-GEN CIVIC INTELLIGENCE PLATFORM
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight sm:leading-none">
              REPORT <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-300">SMARTER.</span><br />
              MOVE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">SAFER.</span><br />
              REPAIR <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">FASTER.</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed">
              Traditional municipal portals collect complaints into a black hole. <strong className="text-cyan-300 font-medium">CivicFix</strong> turns citizen photos into instant AI hazard detection, dynamically reroutes commuters around dangerous road craters and waterlogging, and clusters reports into unified municipal repair missions.
            </p>

            {/* The 6-Stage Innovation Flow Ribbon */}
            <div className="mt-6 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] font-mono text-slate-400 bg-[#0B111F] p-2 sm:p-2.5 rounded-xl border border-white/10 w-fit">
              <span className="text-slate-500 font-semibold px-1">WORKFLOW:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">1. REPORT</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40">2. DETECT (AI)</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40">3. CONNECT (CLUSTER)</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/40">4. PRIORITISE</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800/40">5. DISPATCH</span>
              <span className="text-slate-600">→</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">6. VERIFY</span>
            </div>
          </div>

          {/* Real-Time Impact Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:w-96">
            <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Commuters Protected</span>
                <Route className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">8,920+</div>
              <div className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
                <TrendingDown className="w-3 h-3" /> 0 Accidents on rerouted paths
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Duplicate Dispatches</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">-64%</div>
              <div className="text-[11px] text-purple-400 mt-1 font-mono">
                Via Smart AI Clustering
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Avg. Fix Turnaround</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">4.2 Hrs</div>
              <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                Vs 14 days traditional
              </div>
            </div>

            <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>Citizen Trust Quorum</span>
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-white tracking-tight">96.8%</div>
              <div className="text-[11px] text-amber-400 mt-1 font-mono">
                Closed-loop verified
              </div>
            </div>
          </div>
        </div>

        {/* HACKATHON LIVE DEMO SIMULATION CONTROLS */}
        <div className="mt-8 pt-6 border-t border-white/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                Judges Live Scenario Simulator
              </span>
              <span className="text-xs text-slate-400 font-sans">
                (Click any scenario to watch CivicFix automatically react in real-time)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Scenario 1: Severe Pothole Rerouting */}
            <button
              onClick={() => onTriggerScenario('reroute')}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                activeScenario === 'reroute'
                  ? 'bg-cyan-950/60 border-cyan-400 shadow-glow-cyan'
                  : 'bg-[#0B101D] border-white/10 hover:border-cyan-500/40 hover:bg-[#0E1528]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  SCENARIO 01
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/40">
                  CRITICAL &gt;3M
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200">
                Severe Pothole & Hospital Zone Reroute
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Triggers dynamic commuter rerouting around 3.4m crater on Medical Link Road.
              </p>
            </button>

            {/* Scenario 2: Village Single-Citizen Verification */}
            <button
              onClick={() => onTriggerScenario('rural')}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                activeScenario === 'rural'
                  ? 'bg-amber-950/60 border-amber-400 shadow-glow-amber'
                  : 'bg-[#0B101D] border-white/10 hover:border-amber-500/40 hover:bg-[#0E1528]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                  <TreePine className="w-3.5 h-3.5 text-amber-400" />
                  SCENARIO 02
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/40">
                  RURAL SPECIAL
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200">
                Village Single-User Validated Report
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Low-density locality: 1 genuine citizen photo confirmed without waiting for duplicate.
              </p>
            </button>

            {/* Scenario 3: Monsoon Weather & Drainage Suggestion */}
            <button
              onClick={() => onTriggerScenario('chronic')}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                activeScenario === 'chronic'
                  ? 'bg-purple-950/60 border-purple-400 shadow-glow-purple'
                  : 'bg-[#0B101D] border-white/10 hover:border-purple-500/40 hover:bg-[#0E1528]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 font-mono">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                  SCENARIO 03
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800/40">
                  AI ROOT CAUSE
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200">
                Monsoon Rain & Chronic Drainage Issue
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Road B health score 38/100 triggers AI engineering recommendation for culvert repair.
              </p>
            </button>

            {/* Scenario 4: Smart Clustering Work Order */}
            <button
              onClick={() => onTriggerScenario('cluster')}
              className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                activeScenario === 'cluster'
                  ? 'bg-indigo-950/60 border-indigo-400 shadow-glow-cyan'
                  : 'bg-[#0B101D] border-white/10 hover:border-indigo-500/40 hover:bg-[#0E1528]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  SCENARIO 04
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-400 border border-indigo-800/40">
                  CONNECTED REPAIRS
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200">
                4 Scattered Reports Clustered
              </div>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                Converts nearby complaints into 1 unified mission with materials & crew route.
              </p>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
