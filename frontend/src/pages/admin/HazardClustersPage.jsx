import React, { useState } from 'react';
import { 
  Layers, 
  MapPin, 
  Users, 
  Clock, 
  PlusCircle, 
  Sparkles, 
  ArrowRight,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function HazardClustersPage() {
  const { clusters, incidents } = useCivicData();
  const [selectedCluster, setSelectedCluster] = useState(clusters[0] || null);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <Layers className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>STAGE 03: CONNECT (SPATIAL AI CLUSTERING ENGINE)</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Hazard Spatial Clusters
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Consolidating scattered nearby reports into unified, resource-optimized repair missions.
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
            Duplicate Reduction: <strong className="text-emerald-400">-64% Saved Visits</strong>
          </div>
        </div>

        {/* Informative Explanation Banner */}
        <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs text-white opacity-85 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-brand-blue-light shrink-0" />
          <span>
            DBSCAN spatial clustering groups complaints within 250m on the same corridor into 1 unified mission, grouping crew routes and asphalt deployment.
          </span>
        </div>
      </div>

      {/* Main Clusters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Cluster List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-mono text-white opacity-75 uppercase font-bold block">
            Active Multi-Incident Clusters:
          </span>

          {clusters.map((cluster) => {
            const isSelected = selectedCluster?.id === cluster.id;
            return (
              <div
                key={cluster.id}
                onClick={() => setSelectedCluster(cluster)}
                className={`civic-card p-4 cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-brand-blue-light border-brand-blue-light' : 'hover:border-brand-blue-light/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border">
                    {cluster.id}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-white border border-red-800">
                    {cluster.priority}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{cluster.title}</h3>
                <p className="text-xs text-white opacity-80 font-mono mb-2">{cluster.roadName}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-brand-surface-elevated p-2 rounded border border-brand-border text-white">
                  <div>
                    <span className="opacity-70 block text-[10px]">Grouped Incidents:</span>
                    <strong>{cluster.incidentCount} Scattered Issues</strong>
                  </div>
                  <div>
                    <span className="opacity-70 block text-[10px]">Citizen Reports:</span>
                    <strong>{cluster.totalCitizenReports} Submissions</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Unified Mission Spec (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedCluster ? (
            <div className="civic-card p-6 space-y-5">
              <div className="border-b border-brand-border pb-4">
                <span className="text-xs font-mono font-bold text-brand-blue-light">
                  UNIFIED REPAIR MISSION SPECIFICATION
                </span>
                <h2 className="text-lg font-bold text-white mt-1">{selectedCluster.title}</h2>
                <p className="text-xs text-white opacity-80 mt-0.5">
                  Corridor: {selectedCluster.roadName} • {selectedCluster.distanceSpanMeters}m spatial radius
                </p>
              </div>

              {/* Grouped Incidents Breakdown */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-white uppercase block">
                  Linked Incident Reports ({selectedCluster.incidentIds.length}):
                </span>
                <div className="space-y-2">
                  {selectedCluster.incidentIds.map((incId) => {
                    const inc = incidents.find(i => i.id === incId);
                    return (
                      <div key={incId} className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-center justify-between gap-3 text-xs font-mono">
                        <div>
                          <div className="font-bold text-white">[{incId}] {inc ? inc.title : 'Incident'}</div>
                          <span className="text-[10px] text-white opacity-70">
                            {inc ? inc.category : 'Hazard'} • Span: {inc?.aiData?.estimatedDiameterMeters || 'N/A'}m
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-brand-surface text-white border border-brand-border">
                          Merged
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Calculated Material Requirements */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-white uppercase block">
                  Consolidated Materials & Heavy Machinery:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  {selectedCluster.materialsRequired.map((mat, i) => (
                    <div key={i} className="p-2.5 rounded bg-brand-surface-elevated border border-brand-border flex justify-between text-white">
                      <span>{mat.name}</span>
                      <strong>{mat.quantity}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Stop Optimized Route Sequence */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-white uppercase block">
                  Optimized Field Crew Sequence:
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  {selectedCluster.optimizedCrewRoute.map((step, i) => (
                    <div key={i} className="p-2 rounded bg-brand-surface-elevated border border-brand-border flex items-center gap-3 text-white">
                      <span className="w-5 h-5 rounded-full bg-brand-blue-light text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        {step.step}
                      </span>
                      <span className="flex-1 text-white opacity-90">{step.action}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="civic-card p-6 text-center text-xs text-white opacity-70">
              Select a cluster to view details.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
