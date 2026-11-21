import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  MapPin, 
  PlusCircle, 
  Route, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Map,
  Sparkles
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function CitizenOverviewPage() {
  const { incidents, triggerScenario } = useCivicData();

  // Maximum 4 recent reports
  const recentReports = incidents.slice(0, 4);

  return (
    <div className="space-y-6">
      
      {/* 1. Welcome Message & Quick Scenario Triggers */}
      <div className="civic-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-blue-light" />
            <span>CITIZEN INTELLIGENCE PORTAL</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Welcome to CivicFix
          </h1>
          <p className="text-xs sm:text-sm text-white opacity-85 mt-1 max-w-xl">
            Monitor real-time street safety, file AI-classified hazard reports, and plan safer daily commutes around road craters.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/citizen/report"
            className="btn-primary text-xs font-semibold px-4 py-2"
          >
            <PlusCircle className="w-3.5 h-3.5 text-white" />
            <span>Report an Issue</span>
          </Link>
          <Link
            to="/citizen/map"
            className="btn-secondary text-xs font-medium px-4 py-2"
          >
            <Map className="w-3.5 h-3.5 text-white" />
            <span>View Hazard Map</span>
          </Link>
          <Link
            to="/citizen/navigation"
            className="btn-secondary text-xs font-medium px-4 py-2"
          >
            <Route className="w-3.5 h-3.5 text-white" />
            <span>Safe Reroute</span>
          </Link>
        </div>
      </div>

      {/* 2. Four Important Summary Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Active Hazards</span>
          <div className="text-2xl font-bold font-mono text-white">{incidents.length}</div>
          <span className="text-[11px] text-white opacity-75 font-mono">Real-time corridor sensors</span>
        </div>

        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Critical Reroutes</span>
          <div className="text-2xl font-bold font-mono text-white">
            {incidents.filter(i => i.aiData.severity === 'CRITICAL').length}
          </div>
          <span className="text-[11px] text-white opacity-75 font-mono">&gt;3m crater threshold breached</span>
        </div>

        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Under Repair</span>
          <div className="text-2xl font-bold font-mono text-white">
            {incidents.filter(i => i.status === 'DISPATCHED' || i.status === 'REPAIRING').length}
          </div>
          <span className="text-[11px] text-white opacity-75 font-mono">Assigned municipal crews</span>
        </div>

        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Awaiting Sign-off</span>
          <div className="text-2xl font-bold font-mono text-white">
            {incidents.filter(i => i.status === 'VERIFYING').length}
          </div>
          <span className="text-[11px] text-white opacity-75 font-mono">Citizen quorum pending</span>
        </div>
      </div>

      {/* 3. Compact Live Hazard Preview & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Compact Live Hazard Preview (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="civic-card p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Active Hazard Hotspots
                </h2>
                <p className="text-xs text-white opacity-75">
                  High-priority road craters flagged for commuter avoidance.
                </p>
              </div>
              <Link 
                to="/citizen/map" 
                className="text-xs font-medium text-brand-blue-light hover:underline flex items-center gap-1"
              >
                <span>Full Map</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentReports.slice(0, 3).map((report) => (
                <div 
                  key={report.id}
                  className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-surface text-white border border-brand-border font-semibold">
                        {report.id}
                      </span>
                      <h3 className="text-xs font-bold text-white">{report.title}</h3>
                    </div>
                    <p className="text-xs text-white opacity-80">{report.roadName}</p>
                    <div className="text-[11px] font-mono text-white opacity-70 flex items-center gap-2">
                      <span>Est. Span: {report.aiData.estimatedDiameterMeters || report.aiData.estimatedAreaSqMeters}m</span>
                      <span>•</span>
                      <span>Reported {report.reportedAt}</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                    report.aiData.severity === 'CRITICAL' 
                      ? 'bg-red-950 text-white border border-red-800' 
                      : 'bg-amber-950 text-white border border-amber-800'
                  }`}>
                    {report.aiData.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Reports (Max 4) & Quick Activity Feed (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="civic-card p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-brand-border">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Recent Citizen Activity
              </h2>
              <Link 
                to="/citizen/my-reports" 
                className="text-xs font-medium text-brand-blue-light hover:underline flex items-center gap-1"
              >
                <span>All Reports</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentReports.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-start gap-3 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-brand-blue-light mt-1.5 shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{item.category} Reported</span>
                      <span className="text-[10px] text-white opacity-60 font-mono">{item.reportedAt}</span>
                    </div>
                    <p className="text-white opacity-75 mt-0.5 text-[11px] line-clamp-1">
                      {item.roadName} — Status: <strong className="text-white">{item.status}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo Scenario Switcher for Hackathon Judges */}
          <div className="civic-card p-4">
            <span className="text-xs font-mono font-bold text-white block mb-2">
              HACKATHON DEMO SHORTCUTS
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => triggerScenario('reroute')}
                className="btn-secondary text-[11px] py-1.5 px-2 text-left justify-start"
              >
                🚨 &gt;3m Pothole Reroute
              </button>
              <button
                onClick={() => triggerScenario('rural')}
                className="btn-secondary text-[11px] py-1.5 px-2 text-left justify-start"
              >
                🌾 Village 1-User Policy
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
