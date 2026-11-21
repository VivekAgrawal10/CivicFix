import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  ThumbsUp, 
  ArrowRight,
  Eye,
  Sparkles
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function CitizenVerificationPage() {
  const { incidents, verifyIncident, showToast } = useCivicData();
  const [sliderPos, setSliderPos] = useState(50);

  const verifyingList = incidents.filter(i => i.status === 'VERIFYING' || i.status === 'RESOLVED');
  const activeItem = verifyingList[0] || incidents[0];

  const handleAdminApprove = (id) => {
    verifyIncident(id);
    showToast(`Authority sign-off confirmed for ${id}. Road status set to SAFE.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>STAGE 06: CLOSED-LOOP TRUST & AUTHORITY CONFIRMATION</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Citizen Verification & Reopening Audit
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Cross-referencing contractor repair completion photos with local citizen quorum votes.
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
            Audited Repairs: <strong className="text-white">{verifyingList.length}</strong>
          </div>
        </div>
      </div>

      {/* Main Audit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Before / After Inspection (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="civic-card p-5 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono text-white opacity-80">
              <span className="font-bold">INSPECTION OVERLAY: {activeItem.title}</span>
              <span>DRAG SLIDER</span>
            </div>

            <div className="relative w-full h-72 rounded-xl overflow-hidden border border-brand-border select-none">
              <img 
                src={activeItem.verificationProofUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'} 
                alt="After" 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                AFTER: FINISHED OVERLAY
              </div>

              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img 
                  src={activeItem.imageUrl} 
                  alt="Before" 
                  className="absolute inset-0 w-full h-full object-cover max-w-none"
                  style={{ width: '100%', minWidth: '550px' }}
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                  BEFORE: CRATER
                </div>
              </div>

              <div 
                className="absolute top-0 bottom-0 w-1 bg-brand-blue-light cursor-ew-resize z-20 flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-brand-surface border-2 border-brand-blue-light flex items-center justify-center text-white text-[10px]">
                  ⇄
                </div>
              </div>

              <input 
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />
            </div>
          </div>
        </div>

        {/* Verification Quorum Status & Authority Final Sign-off (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="civic-card p-6 space-y-4">
            <div className="border-b border-brand-border pb-3">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border">
                {activeItem.id}
              </span>
              <h3 className="text-base font-bold text-white mt-1.5">{activeItem.roadName}</h3>
            </div>

            <div className="civic-card-elevated p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-white opacity-70">Citizen Approval:</span>
                <strong className="text-emerald-400">
                  {activeItem.citizenConfirmations?.percentageApproved || 93}%
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white opacity-70">Quorum Progress:</span>
                <strong className="text-white">
                  {activeItem.citizenConfirmations?.upvotes || 14} / {activeItem.citizenConfirmations?.quorumRequired || 15} Votes
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white opacity-70">Road Status:</span>
                <strong className="text-white">{activeItem.status}</strong>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleAdminApprove(activeItem.id)}
                className="btn-primary w-full py-2.5 text-xs font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Authorize Official Reopening & Close Complaint</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
