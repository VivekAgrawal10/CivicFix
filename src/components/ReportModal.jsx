import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Camera, 
  MapPin, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles,
  TreePine,
  Building,
  Hospital,
  School,
  Layers,
  ArrowRight
} from 'lucide-react';

const SAMPLE_PHOTOS = [
  {
    id: 'sample-pothole',
    label: 'Severe Pothole (>3m)',
    category: 'Pothole',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 3.4,
    confidence: 98.7,
    severity: 'CRITICAL',
    title: 'Severe 3.4m Road Crater on Link Road',
    description: 'Deep road crater in middle lane near St. Jude Hospital crossing. Vehicles swerving dangerously.'
  },
  {
    id: 'sample-waterlog',
    label: 'Waterlogging (Monsoon)',
    category: 'Waterlogging',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 4.8,
    confidence: 96.2,
    severity: 'HIGH',
    title: '1.5ft Standing Water Near School',
    description: 'Submerged road curb and storm drain overflow following 40mm monsoon rainfall.'
  },
  {
    id: 'sample-rural',
    label: 'Rural Village Road (Single Reporter)',
    category: 'Pothole',
    url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 2.1,
    confidence: 99.1,
    severity: 'HIGH',
    isRural: true,
    title: 'Unpaved Edge Culvert Crater',
    description: 'Road damage on Kishanpur single-lane rural access connector. Reported by solitary villager.'
  },
  {
    id: 'sample-drain',
    label: 'Broken Storm Drain',
    category: 'Broken Drain',
    url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 1.2,
    confidence: 97.4,
    severity: 'HIGH',
    title: 'Shattered Cast Iron Grate',
    description: 'Drain lid broken open into road shoulder. Hazard for cyclists and students.'
  }
];

export const ReportModal = ({ isOpen, onClose, onSubmitReport }) => {
  const [selectedPhoto, setSelectedPhoto] = useState(SAMPLE_PHOTOS[0]);
  const [category, setCategory] = useState('Pothole');
  const [localityType, setLocalityType] = useState('urban'); // 'urban' or 'rural'
  const [nearHospitalOrSchool, setNearHospitalOrSchool] = useState(true);
  const [title, setTitle] = useState(SAMPLE_PHOTOS[0].title);
  const [description, setDescription] = useState(SAMPLE_PHOTOS[0].description);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(true);
  const [submittedReport, setSubmittedReport] = useState(null);

  if (!isOpen) return null;

  const handleSelectSample = (sample) => {
    setSelectedPhoto(sample);
    setCategory(sample.category);
    setTitle(sample.title);
    setDescription(sample.description);
    if (sample.isRural) {
      setLocalityType('rural');
      setNearHospitalOrSchool(false);
    } else {
      setLocalityType('urban');
      setNearHospitalOrSchool(true);
    }

    // Trigger AI Scan Simulation
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 700);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newReport = {
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      category,
      title,
      description,
      lat: localityType === 'rural' ? 30.3712 : 30.3532,
      lng: localityType === 'rural' ? 76.3980 : 76.3685,
      roadId: localityType === 'rural' ? 'road-village' : 'road-b',
      roadName: localityType === 'rural' ? 'Kishanpur Rural Access Way' : 'Sector 14 - Medical College Link Road',
      locality: localityType === 'rural' ? 'Kishanpur Village Locality' : 'Sector 14 Corridor',
      isRural: localityType === 'rural',
      reportedAt: 'Just now',
      timestamp: new Date().toISOString(),
      reporter: 'You (Verified Citizen)',
      reporterCount: localityType === 'rural' ? 1 : 3,
      status: 'DISPATCHED',
      clusterId: localityType === 'rural' ? 'CL-104' : 'CL-091',
      imageUrl: selectedPhoto.url,
      aiData: {
        detectedType: `${category} Detection`,
        confidence: selectedPhoto.confidence,
        estimatedDiameterMeters: selectedPhoto.estimatedDiameter,
        severity: selectedPhoto.estimatedDiameter >= 3.0 ? 'CRITICAL' : 'HIGH',
        priorityRank: nearHospitalOrSchool ? 1 : 3,
        proximityFlags: nearHospitalOrSchool ? [
          'Within 180m of St. Jude Hospital',
          'School Pedestrian Zone'
        ] : ['Rural Access Route'],
        rerouteTriggered: selectedPhoto.estimatedDiameter >= 3.0,
        isRuralSingleReportValidated: localityType === 'rural',
        singleReportValidationReason: localityType === 'rural' 
          ? 'Low-density population sector. AI photo metadata, EXIF GPS and visual integrity check verified. Promoted to dispatch without duplicate confirmation.' 
          : null
      }
    };

    setSubmittedReport(newReport);
    if (onSubmitReport) {
      onSubmitReport(newReport);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel-elevated rounded-2xl p-6 sm:p-8 border border-white/15 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedReport ? (
          /* Submission Success State */
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-emerald-400 shadow-glow-teal animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-white font-mono">
              REPORT REGISTERED & AI VERIFIED
            </h3>
            
            <p className="text-sm text-slate-300 max-w-lg mx-auto">
              Your civic hazard report has been processed by the CivicFix Vision & Clustering Engine.
            </p>

            <div className="bg-[#0B101D] p-5 rounded-xl border border-white/10 text-left max-w-lg mx-auto space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Incident ID:</span>
                <strong className="text-cyan-400">{submittedReport.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Span:</span>
                <strong className="text-rose-400">{submittedReport.aiData.estimatedDiameterMeters} meters (&gt;3m Severe)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Locality Protocol:</span>
                <strong className="text-amber-400">
                  {submittedReport.isRural ? 'Village Single-Citizen Validated' : 'Urban Cluster Linked (#CL-091)'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hazard Navigation:</span>
                <strong className="text-emerald-400">
                  {submittedReport.aiData.rerouteTriggered ? 'Reroute Broadcasted to Commuters' : 'Advisory Pin Active'}
                </strong>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmittedReport(null);
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-glow-cyan hover:bg-cyan-400 transition-all"
            >
              Back to Live Map
            </button>
          </div>
        ) : (
          /* Report Submission Form */
          <div>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>STAGE 01 & 02: CITIZEN REPORT + AI SEVERITY DETECTION</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Report a Civic Road Hazard
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                CivicFix uses OpenCV and ML to detect crater dimensions, verify authenticity, and coordinate with municipal crews.
              </p>
            </div>

            {/* Quick Test Photos Selector (For Hackathon Demonstration) */}
            <div className="mb-6">
              <label className="text-xs font-mono text-slate-300 block mb-2 font-semibold">
                Select Photo or Use Demo Pre-loads (Simulates Citizen Camera):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_PHOTOS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => handleSelectSample(sample)}
                    className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                      selectedPhoto.id === sample.id
                        ? 'bg-cyan-950/60 border-cyan-400 shadow-glow-cyan'
                        : 'bg-[#0B101D] border-white/10 hover:border-cyan-500/30'
                    }`}
                  >
                    <img 
                      src={sample.url} 
                      alt={sample.label}
                      className="w-full h-16 object-cover rounded-lg mb-1.5" 
                    />
                    <div className="font-semibold text-slate-200 line-clamp-1">{sample.label}</div>
                    <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                      Span: {sample.estimatedDiameter}m
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Computer Vision Live Scanner Preview */}
            <div className="mb-6 bg-[#080D18] p-4 rounded-xl border border-white/10">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Photo with Bounding Box Overlay */}
                <div className="relative w-full sm:w-56 h-36 rounded-xl overflow-hidden border border-cyan-500/40 shrink-0">
                  <img 
                    src={selectedPhoto.url} 
                    alt="Scanning" 
                    className="w-full h-full object-cover"
                  />
                  {/* Futuristic Scanning Reticle */}
                  <div className="absolute inset-0 border-2 border-dashed border-cyan-400/80 rounded-lg pointer-events-none m-3">
                    <span className="absolute top-1 left-1 text-[9px] font-mono bg-cyan-950/90 text-cyan-300 px-1 rounded">
                      CV-EST: {selectedPhoto.estimatedDiameter}m
                    </span>
                    <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-emerald-950/90 text-emerald-300 px-1 rounded">
                      {selectedPhoto.confidence}% MATCH
                    </span>
                  </div>
                  {isScanning && (
                    <div className="absolute inset-0 bg-cyan-400/20 animate-pulse flex items-center justify-center">
                      <span className="text-xs font-mono font-bold text-cyan-200 bg-black/80 px-2 py-1 rounded">
                        SCANNING PIXEL GRADIENTS...
                      </span>
                    </div>
                  )}
                </div>

                {/* AI Detection Telemetry Card */}
                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">AI Classification:</span>
                    <strong className="text-cyan-300 font-mono font-bold">{category} Detected</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">Estimated Diameter:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {selectedPhoto.estimatedDiameter} meters {selectedPhoto.estimatedDiameter >= 3.0 && '(>3m Severe Category)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono">Severity Auto-Tier:</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      selectedPhoto.estimatedDiameter >= 3.0
                        ? 'bg-rose-950 text-rose-400 border border-rose-800/40'
                        : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                    }`}>
                      {selectedPhoto.estimatedDiameter >= 3.0 ? 'CRITICAL • FORCES REROUTE' : 'HIGH • ADVISORY'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5 font-sans">
                    {selectedPhoto.estimatedDiameter >= 3.0 ? (
                      <span className="text-rose-300">
                        🚨 Crater exceeds 3-meter threshold: Dynamic commuter reroute automatically broadcasted to navigation engines.
                      </span>
                    ) : (
                      <span className="text-amber-300">
                        ⚠ Crater below reroute threshold: Commuter advisory warning displayed on navigation heads-up display.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Locality & Proximity Controls */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Locality Selector (Urban vs Rural Innovation) */}
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1 font-semibold">
                    Locality & User Density Rule:
                  </label>
                  <select
                    value={localityType}
                    onChange={(e) => setLocalityType(e.target.value)}
                    className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="urban">Sector 14 Corridor (Dense Urban - Multi-User Quorum)</option>
                    <option value="rural">Kishanpur Village (Low Density - Single Citizen AI Protocol)</option>
                  </select>

                  {localityType === 'rural' ? (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-1.5 font-mono">
                      <TreePine className="w-3.5 h-3.5 shrink-0 text-amber-400 mt-0.5" />
                      <span>
                        <strong>RURAL PROTOCOL ENABLED:</strong> Locality has low user density. 1 report with genuine AI-verified photo is accepted without waiting for second report!
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[11px] text-slate-400 font-mono">
                      Standard Urban Zone: Cross-checks nearby reports & merges into repair clusters.
                    </div>
                  )}
                </div>

                {/* Critical Infrastructure Proximity */}
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1 font-semibold">
                    Critical Infrastructure Proximity:
                  </label>
                  <div className="flex items-center gap-2 bg-[#0B101D] border border-white/10 rounded-xl p-2.5">
                    <input
                      type="checkbox"
                      id="nearHospital"
                      checked={nearHospitalOrSchool}
                      onChange={(e) => setNearHospitalOrSchool(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-white/20 focus:ring-0"
                    />
                    <label htmlFor="nearHospital" className="text-xs text-slate-200 cursor-pointer">
                      Located within 200m of Hospital or School
                    </label>
                  </div>
                  {nearHospitalOrSchool && (
                    <div className="mt-1.5 text-[11px] text-rose-300 font-mono flex items-center gap-1">
                      <Hospital className="w-3.5 h-3.5 text-rose-400" />
                      <span>Priority elevated to TIER-1 EMERGENCY due to ambulance access.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Issue Title:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Description & Observations:
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#0B101D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Submission Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-xs tracking-wide shadow-glow-cyan hover:opacity-95 transition-all active:scale-95 flex items-center gap-2"
                >
                  <span>Submit & Trigger AI Processing</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
