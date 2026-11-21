import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Navigation, 
  Radio, 
  CloudRain, 
  Layers, 
  PlusCircle, 
  Cpu, 
  Wrench,
  CheckCircle2
} from 'lucide-react';

export const Navbar = ({ 
  currentTab, 
  setCurrentTab, 
  onOpenReportModal, 
  activeScenario, 
  setActiveScenario,
  weatherAlertActive 
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/10 backdrop-blur-xl">
      {/* Top Cyber Telemetry Bar */}
      <div className="bg-[#05080E] border-b border-white/5 py-1 px-4 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            SATHACK // THAPAR
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">CYBERNAUTS CIVIC LABS</span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-emerald-400 hidden sm:flex items-center gap-1">
            <Cpu className="w-3 h-3" /> AI Vision & Clustering: ONLINE
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          {weatherAlertActive && (
            <span className="flex items-center gap-1.5 text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
              <CloudRain className="w-3 h-3 animate-bounce" />
              Monsoon Warning: Logging Prone Corridors Active
            </span>
          )}
          <span className="text-slate-400 hidden md:inline">
            Geo-Nodes: <strong className="text-slate-200">142 Connected</strong>
          </span>
          <span className="text-slate-400">
            Latency: <strong className="text-cyan-400">18ms</strong>
          </span>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-700 p-0.5 shadow-glow-cyan flex items-center justify-center">
            <div className="w-full h-full bg-[#090E17] rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-mono">
                CIVIC<span className="text-cyan-400">FIX</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-semibold">
                AI Civic Intelligence
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium hidden sm:block">
              Report Smarter • Move Safer • Repair Faster
            </p>
          </div>
        </div>

        {/* Primary View Switcher */}
        <div className="flex items-center bg-[#0B101D] p-1 rounded-xl border border-white/10 shadow-inner">
          <button
            onClick={() => setCurrentTab('citizen')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'citizen'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-400" />
            <span>Citizen Portal</span>
          </button>

          <button
            onClick={() => setCurrentTab('operations')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === 'operations'
                ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-purple-400" />
            <span>City Operations & Repairs</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenReportModal}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold tracking-wide shadow-glow-cyan hover:opacity-95 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Report Civic Hazard</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </div>
    </header>
  );
};
