import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Wrench, 
  Truck, 
  Package, 
  Clock, 
  ShieldCheck, 
  ThumbsUp, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function RepairTrackingPage() {
  const { clusters, incidents, verifyIncident } = useCivicData();
  const [sliderPosition, setSliderPosition] = useState(50);
  const [voted, setVoted] = useState(false);

  // Target verifying incident
  const verifyingIncident = incidents.find(i => i.status === 'VERIFYING') || incidents[0];
  const quorumRequired = 15;
  const currentUpvotes = verifyingIncident.citizenConfirmations?.upvotes || 14;
  const isFullyVerified = currentUpvotes >= quorumRequired;

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    verifyIncident(verifyingIncident.id);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>STAGE 05 & 06: DISPATCH + CLOSED-LOOP CITIZEN VERIFICATION</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Municipal Repair Tracking & Citizen Quorum
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Repairs must be verified by local citizens before roads are officially marked safe and reopened.
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
            Active Work Orders: <strong className="text-white">{clusters.length}</strong>
          </div>
        </div>
      </div>

      {/* Active Work Orders Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="civic-card p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border">
                {cluster.id}
              </span>
              <span className="text-emerald-400 font-bold">{cluster.status}</span>
            </div>

            <h3 className="text-sm font-bold text-white">{cluster.title}</h3>
            <p className="text-xs text-white opacity-80">{cluster.roadName}</p>

            <div className="civic-card-elevated p-3 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white opacity-70">Assigned Team:</span>
                <strong className="text-white">{cluster.assignedTeam?.teamName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white opacity-70">Crew Vehicle:</span>
                <strong className="text-white">{cluster.assignedTeam?.truckId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white opacity-70">Materials Bundle:</span>
                <strong className="text-white">{cluster.materialsRequired.length} Items Allocated</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Before & After Citizen Verification Section */}
      <div className="civic-card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-border">
          <div>
            <h2 className="text-base font-bold text-white font-mono uppercase">
              Community Repair Sign-off: {verifyingIncident.title}
            </h2>
            <p className="text-xs text-white opacity-80 mt-0.5">
              Contractor has uploaded repair proof. Inspect the before/after overlay and vote to confirm reopening.
            </p>
          </div>

          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg ${
            isFullyVerified 
              ? 'bg-emerald-950 text-white border border-emerald-800' 
              : 'bg-amber-950 text-white border border-amber-800'
          }`}>
            {isFullyVerified ? '✓ QUORUM VERIFIED & REOPENED' : 'AWAITING CITIZEN CONFIRMATION'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Dual Image Comparison Slider (7 Cols) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex justify-between text-xs font-mono text-white opacity-70">
              <span>DRAG SLIDER TO INSPECT BITUMINOUS PATCH</span>
              <span>BEFORE (LEFT) / AFTER (RIGHT)</span>
            </div>

            <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-brand-border select-none">
              {/* After Photo (Base) */}
              <img 
                src={verifyingIncident.verificationProofUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'} 
                alt="After Repair" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                AFTER REPAIR
              </div>

              {/* Before Photo (Clipped) */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                <img 
                  src={verifyingIncident.imageUrl} 
                  alt="Before Hazard" 
                  className="absolute inset-0 w-full h-full object-cover max-w-none"
                  style={{ width: '100%', minWidth: '550px' }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                  BEFORE: 1.8M CRATER
                </div>
              </div>

              {/* Divider Line */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-brand-blue-light cursor-ew-resize z-20 flex items-center justify-center shadow-md"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-brand-surface border-2 border-brand-blue-light flex items-center justify-center text-white text-[10px]">
                  ⇄
                </div>
              </div>

              {/* Range input */}
              <input 
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />
            </div>
          </div>

          {/* Citizen Quorum Tally & Sign-off Action (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="civic-card-elevated p-5 space-y-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-surface text-white border border-brand-border">
                  {verifyingIncident.id}
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5">{verifyingIncident.roadName}</h3>
                <p className="text-xs text-white opacity-80 mt-0.5">
                  Contractor: Municipal Road Maintenance 04
                </p>
              </div>

              {/* Quorum Progress Bar */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-white opacity-75">Citizen Quorum Progress:</span>
                  <strong className="text-white">{currentUpvotes} / {quorumRequired} Votes ({Math.round((currentUpvotes / quorumRequired) * 100)}%)</strong>
                </div>
                <div className="w-full bg-brand-surface h-2 rounded-full overflow-hidden border border-brand-border">
                  <div 
                    className="h-full bg-brand-blue-light transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentUpvotes / quorumRequired) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Voting CTA */}
              <div className="pt-2">
                {isFullyVerified ? (
                  <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-800 text-center text-xs text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                    <strong>QUORUM COMPLETE: ROAD REOPENED</strong>
                    <p className="text-[11px] text-white opacity-80 mt-0.5">
                      Hazard alert cleared from navigation engines. Normal traffic flow restored.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleVote}
                    disabled={voted}
                    className="btn-primary w-full py-2.5 text-xs font-semibold"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-white" />
                    <span>{voted ? 'Confirmation Recorded' : 'I Confirm Road Is Fixed & Safe (+1 Quorum)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
