import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ShieldCheck, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles, 
  Clock, 
  MapPin, 
  ArrowRight,
  Eye,
  Layers
} from 'lucide-react';

export const CommunityVerification = ({ incident, onVerifyFix }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [hasVoted, setHasVoted] = useState(false);
  const [upvotes, setUpvotes] = useState(incident?.citizenConfirmations?.upvotes || 14);
  const [isFullyVerified, setIsFullyVerified] = useState(false);

  const quorumRequired = 15;

  const handleVoteConfirm = () => {
    if (hasVoted) return;
    const newVotes = upvotes + 1;
    setUpvotes(newVotes);
    setHasVoted(true);
    if (newVotes >= quorumRequired) {
      setIsFullyVerified(true);
      if (onVerifyFix) {
        onVerifyFix(incident.id);
      }
    }
  };

  if (!incident) return null;

  return (
    <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>STAGE 06: CLOSED-LOOP TRUST & CITIZEN VERIFICATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Community Repair Sign-off & Before/After Proof
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Repairs cannot be closed by municipal contractors alone. Citizens in the locality inspect proof photos and vote to officially restore road status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Status:</span>
          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
            isFullyVerified 
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-glow-teal'
              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
          }`}>
            {isFullyVerified ? '✓ VERIFIED & REOPENED' : 'AWAITING 1 MORE CITIZEN VOTE'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Interactive Before & After Visual Inspection */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span>DRAG SLIDER TO INSPECT REPAIR QUALITY</span>
            <span className="text-cyan-400 font-semibold">BEFORE (LEFT) / AFTER (RIGHT)</span>
          </div>

          <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden select-none border border-white/10 shadow-2xl">
            {/* After Photo (Full background) */}
            <img 
              src={incident.verificationProofUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80'} 
              alt="After Repair" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 bg-emerald-950/90 text-emerald-300 font-mono text-[10px] px-2 py-1 rounded border border-emerald-500/40 font-bold z-10">
              AFTER: COMPACTED BITUMEN OVERLAY
            </div>

            {/* Before Photo (Clipped by slider position) */}
            <div 
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <img 
                src={incident.imageUrl} 
                alt="Before Hazard" 
                className="absolute inset-0 w-full h-full object-cover max-w-none"
                style={{ width: '100%', minWidth: '600px' }}
              />
              <div className="absolute top-3 left-3 bg-rose-950/90 text-rose-300 font-mono text-[10px] px-2 py-1 rounded border border-rose-500/40 font-bold">
                BEFORE: 1.8M POTHOLE
              </div>
            </div>

            {/* Slider Divider Bar */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-cyan-400 cursor-ew-resize z-20 flex items-center justify-center shadow-[0_0_15px_#00F2FE]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="w-7 h-7 rounded-full bg-[#0B101D] border-2 border-cyan-400 flex items-center justify-center text-cyan-300 text-xs shadow-lg">
                ⇄
              </div>
            </div>

            {/* Hidden native range input on top for smooth dragging */}
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

        {/* Community Quorum & Voting Action */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0B101D] p-5 rounded-2xl border border-white/10 space-y-4">
            
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                WORK ORDER #CL-082
              </span>
              <h3 className="text-base font-bold text-white mt-1.5">{incident.title}</h3>
              <p className="text-xs text-slate-300 mt-0.5">{incident.roadName}</p>
            </div>

            {/* Contractor Metadata */}
            <div className="bg-[#070A10] p-3 rounded-xl border border-white/5 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Contractor:</span>
                <strong className="text-slate-200">Municipal Road Maintenance Gang 04</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Materials Applied:</span>
                <strong className="text-cyan-400">2.4T Hot Bituminous Premix</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Completed:</span>
                <strong className="text-emerald-400">25 mins ago</strong>
              </div>
            </div>

            {/* Citizen Quorum Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Citizen Quorum Progress:</span>
                <strong className="text-emerald-400">{upvotes} / {quorumRequired} Votes ({Math.round((upvotes/quorumRequired)*100)}%)</strong>
              </div>
              <div className="w-full bg-[#1A253F] h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, (upvotes / quorumRequired) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Citizen Vote CTA */}
            <div className="pt-2">
              {isFullyVerified ? (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-1">
                  <div className="text-xs font-bold font-mono text-emerald-300 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    QUORUM REACHED: ROAD STATUS SAFE
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Hazard alert cleared from navigation feeds. Normal traffic speed restored.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={handleVoteConfirm}
                    disabled={hasVoted}
                    className={`w-full py-3 rounded-xl font-bold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-md ${
                      hasVoted
                        ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-600/40 cursor-default'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:opacity-95 active:scale-98 shadow-glow-teal'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{hasVoted ? 'Your Citizen Confirmation Recorded!' : 'I Confirm Road Is Fixed & Safe (+1 Quorum)'}</span>
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-mono">
                    Verified through device geofence (within 500m of site).
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
