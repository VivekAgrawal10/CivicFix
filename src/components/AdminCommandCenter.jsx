import React, { useState } from 'react';
import { 
  Layers, 
  Wrench, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingDown, 
  ShieldAlert, 
  Users, 
  Package, 
  Route, 
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle
} from 'lucide-react';
import { INITIAL_CLUSTERS, INITIAL_INCIDENTS } from '../data/mockData';

export const AdminCommandCenter = ({ clusters = INITIAL_CLUSTERS, onUpdateClusterStatus }) => {
  const [selectedClusterId, setSelectedClusterId] = useState(clusters[0]?.id || 'CL-091');
  const [clusterList, setClusterList] = useState(clusters);

  const selectedCluster = clusterList.find(c => c.id === selectedClusterId) || clusterList[0];

  const handleAdvanceStatus = (clusterId) => {
    setClusterList(prev => prev.map(c => {
      if (c.id === clusterId) {
        let nextStatus = 'REPAIR_IN_PROGRESS';
        if (c.status === 'REPAIR_IN_PROGRESS') nextStatus = 'AWAITING_CITIZEN_VERIFICATION';
        else if (c.status === 'AWAITING_CITIZEN_VERIFICATION') nextStatus = 'RESOLVED';
        return {
          ...c,
          status: nextStatus,
          assignedTeam: {
            ...c.assignedTeam,
            status: nextStatus === 'REPAIR_IN_PROGRESS' ? 'ON_SITE_ACTIVE' : 'COMPLETED'
          }
        };
      }
      return c;
    }));

    if (onUpdateClusterStatus) {
      onUpdateClusterStatus(clusterId);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-400 font-semibold mb-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>SMART CITY INCIDENT CLUSTERING & DISPATCH PLATFORM</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Unified Civic Repair Command Center
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Turning scattered citizen complaints into coordinated, resource-optimized repair missions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass-panel px-3 py-1.5 rounded-xl border border-purple-500/30 text-xs font-mono text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI Clustering Efficiency: <strong>+64% Saved Visits</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Clustering Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Clustered Missions List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>ACTIVE UNIFIED REPAIR MISSIONS</span>
            <span className="text-purple-400">{clusterList.length} Coordinated Clusters</span>
          </div>

          {clusterList.map((cluster) => {
            const isSelected = cluster.id === selectedClusterId;
            return (
              <div
                key={cluster.id}
                onClick={() => setSelectedClusterId(cluster.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-950/50 to-[#0F172A] border-purple-500 shadow-glow-cyan'
                    : 'bg-[#0B101D] border-white/10 hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40 font-bold">
                      {cluster.id}
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      {cluster.incidentCount} Scattered Issues Linked
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    cluster.priority === 'EMERGENCY_TIER_1'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                      : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                  }`}>
                    {cluster.priority === 'EMERGENCY_TIER_1' ? 'PRIORITY: TIER 1' : 'PRIORITY: RURAL MODERATE'}
                  </span>
                </div>

                <h4 className="text-sm font-semibold text-white mb-1">
                  {cluster.title}
                </h4>

                <p className="text-xs text-slate-400 mb-3 font-mono">
                  Corridor: {cluster.roadName} ({cluster.distanceSpanMeters}m cluster radius)
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 bg-[#070A10] p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{cluster.totalCitizenReports} Citizen Reports</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Est: {cluster.estimatedTotalRepairTime}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Assigned Team:</span>
                  <span className="text-cyan-300 font-semibold">{cluster.assignedTeam?.teamName}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Unified Work Order & Multi-Stop Dispatch */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0B101D] p-5 rounded-2xl border border-white/10 space-y-5">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-purple-400 font-bold">
                    UNIFIED WORK ORDER SPECIFICATION
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-xs font-mono text-slate-300">{selectedCluster.id}</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                  {selectedCluster.title}
                </h3>
              </div>

              {/* Status Pill */}
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/40 w-fit">
                {selectedCluster.status}
              </span>
            </div>

            {/* AI Priority Scoring Breakdown */}
            <div className="bg-[#070A10] p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">PRIORITY MATRIX COMPUTATION:</span>
                <strong className="text-rose-400 font-bold">98/100 (Emergency Rank #1)</strong>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                <div className="bg-white/5 p-2 rounded">
                  <span className="text-slate-400 block text-[10px]">Hazard Severity</span>
                  <strong className="text-rose-400">&gt;3m Crater (40 pts)</strong>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <span className="text-slate-400 block text-[10px]">Hospital Proximity</span>
                  <strong className="text-cyan-400">140m St. Jude (35 pts)</strong>
                </div>
                <div className="bg-white/5 p-2 rounded">
                  <span className="text-slate-400 block text-[10px]">Traffic Volume</span>
                  <strong className="text-amber-400">32,000/day (23 pts)</strong>
                </div>
              </div>
            </div>

            {/* Required Materials & Heavy Machinery (Slide 05) */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-2 font-semibold">
                <Package className="w-3.5 h-3.5 text-cyan-400" />
                <span>MATERIALS & EQUIPMENT BUNDLE (AUTO-CALCULATED BY AI):</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedCluster.materialsRequired.map((mat, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#070A10] border border-white/5 text-xs font-mono"
                  >
                    <span className="text-slate-300">{mat.name}</span>
                    <strong className="text-cyan-300">{mat.quantity}</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Contractor & Crew Information */}
            <div className="bg-gradient-to-r from-cyan-950/30 to-[#0B101D] p-3.5 rounded-xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Truck className="w-4 h-4" />
                  <span>{selectedCluster.assignedTeam?.teamName}</span>
                </div>
                <div className="text-slate-300">
                  Supervisor: <strong>{selectedCluster.assignedTeam?.supervisor}</strong> • Truck: {selectedCluster.assignedTeam?.truckId}
                </div>
              </div>

              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Crew Status:</span>
                <span className="text-emerald-400 font-bold font-mono">
                  {selectedCluster.assignedTeam?.status} (ETA {selectedCluster.assignedTeam?.etaMinutes}m)
                </span>
              </div>
            </div>

            {/* Optimized Multi-Stop Route Plan */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400 mb-2 font-semibold">
                <Route className="w-3.5 h-3.5 text-purple-400" />
                <span>OPTIMIZED MULTI-STOP CREW SEQUENCE:</span>
              </div>

              <div className="space-y-2">
                {selectedCluster.optimizedCrewRoute.map((step, i) => (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg bg-[#070A10] border border-white/5 text-xs font-mono"
                  >
                    <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-500 flex items-center justify-center text-[10px] text-purple-300 font-bold shrink-0">
                      {step.step}
                    </span>
                    <span className="text-slate-200 flex-1">{step.action}</span>
                    <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                      {step.target}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispatch Action Stepper */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-400">
                Action: Update lifecycle stage of this unified mission
              </span>

              <button
                onClick={() => handleAdvanceStatus(selectedCluster.id)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-xs font-mono shadow-glow-cyan transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Advance Mission to Next Stage</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
