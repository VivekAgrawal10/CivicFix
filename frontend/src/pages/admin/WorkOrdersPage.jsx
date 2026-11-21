import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Wrench, 
  Truck, 
  Package, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  Plus
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function WorkOrdersPage() {
  const { clusters, updateClusterStatus } = useCivicData();
  const [activeOrder, setActiveOrder] = useState(clusters[0] || null);

  const handleNextStage = (orderId) => {
    if (!activeOrder) return;
    let next = 'REPAIR_IN_PROGRESS';
    if (activeOrder.status === 'REPAIR_IN_PROGRESS') next = 'AWAITING_CITIZEN_VERIFICATION';
    else if (activeOrder.status === 'AWAITING_CITIZEN_VERIFICATION') next = 'COMPLETED';
    
    updateClusterStatus(orderId, next);
    setActiveOrder({ ...activeOrder, status: next });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>STAGE 05: DISPATCH & CONTRACTOR WORK ORDERS</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Repair Work Orders Management
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Issue and coordinate formal municipal repair work orders with field crews and contractors.
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
            Active Dispatches: <strong className="text-white">{clusters.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Work Orders List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-mono text-white opacity-75 uppercase font-bold block">
            Work Order Queue:
          </span>

          {clusters.map((order) => {
            const isSelected = activeOrder?.id === order.id;
            return (
              <div
                key={order.id}
                onClick={() => setActiveOrder(order)}
                className={`civic-card p-4 cursor-pointer transition-all ${
                  isSelected ? 'ring-2 ring-brand-blue-light border-brand-blue-light' : 'hover:border-brand-blue-light/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border">
                    {order.id}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-emerald-400">
                    {order.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{order.title}</h3>
                <p className="text-xs text-white opacity-70 font-mono mb-2">{order.roadName}</p>

                <div className="text-[11px] font-mono text-white bg-brand-surface-elevated p-2 rounded border border-brand-border flex justify-between">
                  <span>Assigned:</span>
                  <strong className="text-white">{order.assignedTeam?.teamName}</strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Work Order Operations Sheet (7 Cols) */}
        <div className="lg:col-span-7">
          {activeOrder ? (
            <div className="civic-card p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-brand-border">
                <div>
                  <span className="text-xs font-mono text-brand-blue-light font-bold">
                    DISPATCH SHEET: {activeOrder.id}
                  </span>
                  <h2 className="text-base font-bold text-white mt-1">{activeOrder.title}</h2>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
                  {activeOrder.status}
                </span>
              </div>

              {/* Contractor & Crew Telemetry */}
              <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-white opacity-70">Contractor Company:</span>
                  <strong className="text-white">{activeOrder.assignedTeam?.teamName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white opacity-70">Field Supervisor:</span>
                  <strong className="text-white">{activeOrder.assignedTeam?.supervisor}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white opacity-70">Vehicle Registration:</span>
                  <strong className="text-white">{activeOrder.assignedTeam?.truckId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white opacity-70">Crew Size:</span>
                  <strong className="text-white">{activeOrder.assignedTeam?.crewSize} Technicians</strong>
                </div>
              </div>

              {/* Allocated Materials */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-white uppercase block">
                  Material Allocations for this Mission:
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  {activeOrder.materialsRequired.map((m, i) => (
                    <div key={i} className="p-2.5 rounded bg-brand-surface-elevated border border-brand-border flex justify-between text-white">
                      <span>{m.name}</span>
                      <strong>{m.quantity}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Update Action */}
              <div className="pt-3 border-t border-brand-border flex items-center justify-between gap-4">
                <span className="text-xs text-white opacity-80 font-mono">
                  Advance mission through municipal repair lifecycle
                </span>
                <button
                  onClick={() => handleNextStage(activeOrder.id)}
                  className="btn-primary text-xs font-semibold px-4 py-2"
                >
                  <span>Advance Lifecycle Stage</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="civic-card p-6 text-center text-xs text-white opacity-70">
              Select a work order.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
