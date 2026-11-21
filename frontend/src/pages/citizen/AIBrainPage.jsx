import React, { useState } from 'react';
import { 
  Cpu, 
  Sparkles, 
  Layers, 
  AlertTriangle, 
  Target, 
  ShieldCheck, 
  Activity, 
  CheckCircle2,
  Sliders
} from 'lucide-react';

const AI_DEMO_MODELS = [
  {
    name: 'CV-YOLO Pothole Meter',
    type: 'Computer Vision',
    accuracy: '98.7%',
    latency: '34ms',
    purpose: 'Crater bounding box detection and diameter measurement (&gt;3.0m threshold).'
  },
  {
    name: 'Perceptual Image Hash & NLP',
    type: 'Similarity Matching',
    accuracy: '96.2%',
    latency: '18ms',
    purpose: 'Detects duplicate complaints in the same 200m zone to eliminate repeated dispatches.'
  },
  {
    name: 'Geo-Spatial Clustering Engine',
    type: 'Spatial Clustering (DBSCAN)',
    accuracy: '99.1%',
    latency: '12ms',
    purpose: 'Aggregates scattered citizen reports into a single consolidated repair work order.'
  },
  {
    name: 'Weighted Priority Matrix',
    type: 'Risk Scoring Algorithm',
    accuracy: '100%',
    latency: '4ms',
    purpose: 'Elevates priority for hazards near hospitals, schools, and heavy arterial routes.'
  }
];

export function AIBrainPage() {
  const [selectedSample, setSelectedSample] = useState('pothole');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <Cpu className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>MACHINE LEARNING & CIVIC INTELLIGENCE MODELS</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              AI Decision & Classification Core
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              How CivicFix turns raw citizen photographs and geotags into verified municipal missions and safety routes.
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
            <span>Status: </span>
            <strong className="text-emerald-400">SIMULATED DEMO ACTIVE</strong>
          </div>
        </div>

        {/* Clear Demonstration Notice */}
        <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs text-white opacity-90 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-blue-light shrink-0" />
          <span>
            <strong>Hackathon Note:</strong> The models below demonstrate the OpenCV/YOLO inference and DBSCAN clustering logic using simulated real-world telemetry.
          </span>
        </div>
      </div>

      {/* 4 Core AI Pipeline Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {AI_DEMO_MODELS.map((model, i) => (
          <div key={i} className="civic-card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border">
                {model.type}
              </span>
              <span className="text-emerald-400 font-bold">{model.accuracy}</span>
            </div>

            <h3 className="text-sm font-bold text-white">{model.name}</h3>
            <p className="text-xs text-white opacity-80 leading-relaxed">{model.purpose}</p>

            <div className="pt-2 border-t border-brand-border text-[11px] font-mono text-white opacity-60 flex justify-between">
              <span>Inference:</span>
              <strong className="text-white">{model.latency}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive AI Simulation Lab */}
      <div className="civic-card p-6 space-y-5">
        <div className="border-b border-brand-border pb-3">
          <h2 className="text-base font-bold text-white font-mono uppercase">
            Interactive Hazard Classification Sandbox
          </h2>
          <p className="text-xs text-white opacity-80 mt-0.5">
            Select a hazard condition to inspect the AI's diagnostic reasoning and automated dispatch decision.
          </p>
        </div>

        {/* Condition Switcher */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'pothole', label: 'Crater > 3.0m (Hospital Zone)' },
            { id: 'rural', label: 'Village Single-Reporter Pothole' },
            { id: 'waterlog', label: 'Recurring Waterlogging (Drainage Defect)' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedSample(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedSample === item.id 
                  ? 'bg-brand-blue-light text-white' 
                  : 'bg-brand-surface-elevated text-white hover:bg-brand-surface'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Diagnostic Output Breakdown */}
        {selectedSample === 'pothole' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">1. COMPUTER VISION</span>
              <h4 className="font-bold text-white text-sm">Crater Dimension Measurement</h4>
              <p className="text-white opacity-80">
                Bounding polygon calculated crater span at <strong className="text-white font-bold">3.4 meters</strong>, exceeding the 3.0m critical safety threshold.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">2. RISK SCORING</span>
              <h4 className="font-bold text-white text-sm">Hospital Proximity Weight</h4>
              <p className="text-white opacity-80">
                Distance to St. Jude Hospital is 140m. Automatic priority bump of +35 pts elevating mission to <strong className="text-white font-bold">Tier-1 Emergency</strong>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">3. AUTOMATED ACTION</span>
              <h4 className="font-bold text-white text-sm">Dynamic Commuter Rerouting</h4>
              <p className="text-white opacity-80">
                Navigation engine immediately diverts commuter traffic via the North Ring Expressway bypass.
              </p>
            </div>
          </div>
        )}

        {selectedSample === 'rural' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">1. DENSITY RECOGNITION</span>
              <h4 className="font-bold text-white text-sm">Village Low-Density Protocol</h4>
              <p className="text-white opacity-80">
                Locality has low population density (&lt;20 users/km²). Standard duplicate requirement is waived.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">2. INTEGRITY VERIFICATION</span>
              <h4 className="font-bold text-white text-sm">Single-Photo EXIF Check</h4>
              <p className="text-white opacity-80">
                AI verifies GPS coordinates match camera sensor metadata and image is un-tampered (99.1% authentic).
              </p>
            </div>

            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">3. AUTOMATED ACTION</span>
              <h4 className="font-bold text-white text-sm">Direct Work Order Dispatch</h4>
              <p className="text-white opacity-80">
                Promoted directly to District Rural Mobile Gang 02 without waiting for a second citizen report.
              </p>
            </div>
          </div>
        )}

        {selectedSample === 'waterlog' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">1. PATTERN ANALYSIS</span>
              <h4 className="font-bold text-white text-sm">Chronic Failure Detection</h4>
              <p className="text-white opacity-80">
                Corridor experienced 4 waterlogging events and 3 pothole washouts in 60 days despite 2 surface patches.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">2. ROOT CAUSE INFERENCE</span>
              <h4 className="font-bold text-white text-sm">Culvert Gradient Reversal</h4>
              <p className="text-white opacity-80">
                Telemetry points to continuous storm culvert gradient blockage at Culvert #12 rather than surface defect.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-2 text-xs">
              <span className="text-[10px] font-mono font-bold text-white opacity-60 block">3. AUTOMATED ACTION</span>
              <h4 className="font-bold text-white text-sm">Civil Engineering Advisory</h4>
              <p className="text-white opacity-80">
                AI advises halting surface asphalt patching and dispatches civil conduit overhaul advisory to contractor.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
