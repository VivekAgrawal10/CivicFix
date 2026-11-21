import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Inbox, 
  AlertTriangle, 
  Layers, 
  Truck, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function AdminOverviewPage() {
  const { incidents, clusters } = useCivicData();

  const totalComplaints = incidents.length;
  const criticalHazards = incidents.filter(i => i.aiData.severity === 'CRITICAL').length;
  const activeMissions = clusters.length;
  const pendingVerification = incidents.filter(i => i.status === 'VERIFYING').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="civic-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
            <BarChart3 className="w-3.5 h-3.5 text-brand-blue-light" />
            <span>MUNICIPAL COMMAND & CONTROL OPERATIONS</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            City Operations Overview
          </h1>
          <p className="text-xs text-white opacity-80 mt-1">
            Central dashboard managing incoming civic complaints, automated spatial clustering, and field crew deployments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/complaints"
            className="btn-primary text-xs font-semibold px-4 py-2"
          >
            <span>Manage All Complaints</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </Link>
        </div>
      </div>

      {/* 4 Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Total Complaints</span>
          <div className="text-2xl font-bold font-mono text-white">{totalComplaints}</div>
          <span className="text-[11px] text-white opacity-70 font-mono">100% geocoded via GIS</span>
        </div>

        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Critical Hazards</span>
          <div className="text-2xl font-bold font-mono text-red-400">{criticalHazards}</div>
          <span className="text-[11px] text-white opacity-70 font-mono">&gt;3m craters / high impact</span>
        </div>

        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Active Repair Missions</span>
          <div className="text-2xl font-bold font-mono text-brand-blue-light">{activeMissions}</div>
          <span className="text-[11px] text-white opacity-70 font-mono">Consolidated unified clusters</span>
        </div>

        <div className="civic-card p-4">
          <span className="text-xs font-mono text-white opacity-70 block mb-1">Awaiting Citizen Quorum</span>
          <div className="text-2xl font-bold font-mono text-white">{pendingVerification}</div>
          <span className="text-[11px] text-white opacity-70 font-mono">Proof uploaded by contractors</span>
        </div>
      </div>

      {/* Visual Analytics & Recent Incident Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Category Breakdown & Cluster Efficiency (Left 6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="civic-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase font-mono border-b border-brand-border pb-3">
              Incident Category Distribution
            </h2>

            <div className="space-y-3 text-xs font-mono">
              {[
                { name: 'Pothole & Surface Craters', count: incidents.filter(i => i.category === 'Pothole').length, pct: 55 },
                { name: 'Waterlogging & Flood Stagnation', count: incidents.filter(i => i.category === 'Waterlogging').length, pct: 25 },
                { name: 'Broken Storm Drains & Grates', count: incidents.filter(i => i.category === 'Broken Drain').length, pct: 12 },
                { name: 'General Road Structural Damage', count: incidents.filter(i => i.category === 'Road Damage').length, pct: 8 },
              ].map(cat => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-white">
                    <span>{cat.name}</span>
                    <strong>{cat.count} Reports ({cat.pct}%)</strong>
                  </div>
                  <div className="w-full bg-brand-surface-elevated h-2 rounded-full overflow-hidden border border-brand-border">
                    <div 
                      className="h-full bg-brand-blue-light"
                      style={{ width: `${cat.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs text-white opacity-85">
              <strong>Spatial Clustering Efficiency:</strong> Grouping reports within a 250m radius has reduced duplicate field vehicle deployments by <strong>64%</strong>.
            </div>
          </div>
        </div>

        {/* Recent Operational Log (Right 6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="civic-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h2 className="text-sm font-bold text-white uppercase font-mono">
                Recent Dispatch Activity
              </h2>
              <Link 
                to="/admin/work-orders" 
                className="text-xs text-brand-blue-light hover:underline flex items-center gap-1 font-mono"
              >
                <span>All Orders</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </Link>
            </div>

            <div className="space-y-3">
              {incidents.slice(0, 4).map(inc => (
                <div key={inc.id} className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-brand-surface text-white border border-brand-border">
                        {inc.id}
                      </span>
                      <strong className="text-white">{inc.title}</strong>
                    </div>
                    <p className="text-white opacity-70 text-[11px]">{inc.roadName}</p>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-brand-surface border border-brand-border font-semibold text-white shrink-0">
                    {inc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
