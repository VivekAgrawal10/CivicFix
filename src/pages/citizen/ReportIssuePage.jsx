import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  MapPin, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  TreePine, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

const SAMPLE_PHOTOS = [
  {
    id: 'sample-pothole',
    label: 'Pothole Crater (>3m)',
    category: 'Pothole',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 3.4,
    confidence: 98.7,
    title: 'Severe 3.4m Road Crater on Link Road',
    description: 'Deep road crater in center lane near St. Jude Hospital crossing. Vehicles swerving dangerously.'
  },
  {
    id: 'sample-waterlog',
    label: 'Waterlogging Stagnation',
    category: 'Waterlogging',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 4.8,
    confidence: 96.2,
    title: '1.5ft Standing Water Near School',
    description: 'Submerged road curb and storm drain overflow following monsoon rainfall.'
  },
  {
    id: 'sample-rural',
    label: 'Rural Access Road (1-User Policy)',
    category: 'Pothole',
    url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 2.1,
    confidence: 99.1,
    isRural: true,
    title: 'Unpaved Edge Culvert Crater',
    description: 'Road damage on single-lane rural village access connector.'
  },
  {
    id: 'sample-drain',
    label: 'Broken Storm Grate',
    category: 'Broken Drain',
    url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    estimatedDiameter: 1.2,
    confidence: 97.4,
    title: 'Shattered Cast Iron Grate',
    description: 'Drain lid broken open into road shoulder. Severe hazard for cyclists.'
  }
];

export function ReportIssuePage() {
  const navigate = useNavigate();
  const { addIncident } = useCivicData();

  const [selectedPhoto, setSelectedPhoto] = useState(SAMPLE_PHOTOS[0]);
  const [category, setCategory] = useState('Pothole');
  const [title, setTitle] = useState(SAMPLE_PHOTOS[0].title);
  const [description, setDescription] = useState(SAMPLE_PHOTOS[0].description);
  const [localityType, setLocalityType] = useState('urban');
  const [nearHospitalOrSchool, setNearHospitalOrSchool] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [submittedReport, setSubmittedReport] = useState(null);

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

    // Trigger AI Vision scan simulation
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

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
      reporter: 'You (Citizen App)',
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
          'School Pedestrian Walkway Zone'
        ] : ['Rural Access Route'],
        rerouteTriggered: selectedPhoto.estimatedDiameter >= 3.0,
        isRuralSingleReportValidated: localityType === 'rural',
        singleReportValidationReason: localityType === 'rural'
          ? 'Low-density population sector. AI photo metadata, EXIF GPS and visual integrity check verified. Promoted without duplicate confirmation.'
          : null
      }
    };

    addIncident(newReport);
    setSubmittedReport(newReport);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="civic-card p-6">
        <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
          <Camera className="w-3.5 h-3.5 text-brand-blue-light" />
          <span>STAGE 01 & 02: REPORT + AI COMPUTER VISION DETECTION</span>
        </div>
        <h1 className="text-2xl font-bold text-white">
          Report a Road Hazard
        </h1>
        <p className="text-xs sm:text-sm text-white opacity-85 mt-1">
          CivicFix scans uploaded photos using computer vision models to measure crater diameter (&gt;3m severe threshold) and dynamically adjusts confirmation rules for rural villages.
        </p>
      </div>

      {submittedReport ? (
        /* Confirmation Success Card */
        <div className="civic-card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-900 border-2 border-emerald-500 mx-auto flex items-center justify-center text-white shadow-md">
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>

          <h2 className="text-xl font-bold text-white font-mono">
            COMPLAINT REGISTERED & AI PROCESSED
          </h2>
          <p className="text-xs sm:text-sm text-white opacity-80 max-w-md mx-auto">
            Your report has been analyzed, verified and submitted into the municipal civic dispatch pipeline.
          </p>

          <div className="civic-card-elevated p-4 max-w-md mx-auto text-left text-xs font-mono space-y-2">
            <div className="flex justify-between">
              <span className="text-white opacity-70">Tracking ID:</span>
              <strong className="text-white font-bold">{submittedReport.id}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-white opacity-70">AI Crater Span:</span>
              <strong className="text-white">{submittedReport.aiData.estimatedDiameterMeters}m ({submittedReport.aiData.severity})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-white opacity-70">Locality Protocol:</span>
              <strong className="text-white">
                {submittedReport.isRural ? 'Village 1-User Policy' : 'Urban Cluster Linked (#CL-091)'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-white opacity-70">Commuter Navigation:</span>
              <strong className="text-white">
                {submittedReport.aiData.rerouteTriggered ? 'Reroute Broadcast Active' : 'Advisory Display Active'}
              </strong>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => setSubmittedReport(null)}
              className="btn-secondary text-xs px-4 py-2"
            >
              Report Another Issue
            </button>
            <button
              onClick={() => navigate('/citizen/my-reports')}
              className="btn-primary text-xs px-4 py-2"
            >
              <span>View My Reports</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      ) : (
        /* The Reporting Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Sample Photo Selector (Preloads for Hackathon Demo) */}
          <div className="civic-card p-5 space-y-3">
            <label className="text-xs font-mono font-bold text-white block">
              1. Choose Photo or Test Sample (Simulates Camera Upload):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {SAMPLE_PHOTOS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`p-2 rounded-lg text-left border transition-all text-xs flex flex-col justify-between ${
                    selectedPhoto.id === sample.id
                      ? 'bg-brand-surface-elevated border-brand-blue-light ring-1 ring-brand-blue-light'
                      : 'bg-brand-surface border-brand-border hover:bg-brand-surface-hover'
                  }`}
                >
                  <img 
                    src={sample.url} 
                    alt={sample.label} 
                    className="w-full h-16 object-cover rounded mb-1.5"
                  />
                  <div className="font-semibold text-white line-clamp-1">{sample.label}</div>
                  <div className="text-[10px] text-white opacity-75 font-mono mt-0.5">
                    Span: {sample.estimatedDiameter}m
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Vision Measurement Scanner Preview */}
          <div className="civic-card p-5">
            <label className="text-xs font-mono font-bold text-white block mb-3">
              2. AI Computer Vision Dimension Estimation:
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-56 h-36 rounded-lg overflow-hidden border border-brand-border shrink-0">
                <img 
                  src={selectedPhoto.url} 
                  alt="Scanning" 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 border-2 border-dashed border-white/80 rounded m-2 pointer-events-none">
                  <span className="absolute top-1 left-1 text-[9px] font-mono bg-black/80 text-white px-1 rounded">
                    CV: {selectedPhoto.estimatedDiameter}m
                  </span>
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/80 text-white px-1 rounded">
                    {selectedPhoto.confidence}% MATCH
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs font-mono">
                <div className="flex justify-between pb-1 border-b border-brand-border">
                  <span className="text-white opacity-75">Estimated Diameter:</span>
                  <strong className="text-white font-bold">
                    {selectedPhoto.estimatedDiameter} meters {selectedPhoto.estimatedDiameter >= 3.0 && '(>3.0m Severe Category)'}
                  </strong>
                </div>
                <div className="flex justify-between pb-1 border-b border-brand-border">
                  <span className="text-white opacity-75">AI Classification:</span>
                  <strong className="text-white">{category}</strong>
                </div>
                <div className="flex justify-between pb-1 border-b border-brand-border">
                  <span className="text-white opacity-75">Dynamic Action:</span>
                  <strong className="text-white">
                    {selectedPhoto.estimatedDiameter >= 3.0 ? '🚨 Commuter Rerouting Triggered' : '⚠ Advisory Warning Displayed'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Locality & Proximity Rules */}
          <div className="civic-card p-5 space-y-4">
            <label className="text-xs font-mono font-bold text-white block">
              3. Locality Context & Proximity Intelligence:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white opacity-85 block mb-1">
                  Locality Density Rule:
                </label>
                <select
                  value={localityType}
                  onChange={(e) => setLocalityType(e.target.value)}
                  className="civic-input w-full text-xs"
                >
                  <option value="urban">Sector 14 Corridor (Dense Urban - Multi-User Quorum)</option>
                  <option value="rural">Kishanpur Village (Low Density - 1-Citizen AI Policy)</option>
                </select>

                {localityType === 'rural' ? (
                  <div className="mt-2 p-2 rounded bg-brand-surface-elevated border border-brand-border text-[11px] text-white">
                    🌾 <strong>Low-Density Locality Policy:</strong> Single citizen report accepted via AI photo integrity without waiting for duplicate confirmation.
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-white opacity-70">
                    Urban Area: Compares and clusters nearby complaints within 250m.
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-white opacity-85 block mb-1">
                  Sensitive Zone Check:
                </label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-brand-surface-elevated border border-brand-border">
                  <input
                    type="checkbox"
                    id="nearHospital"
                    checked={nearHospitalOrSchool}
                    onChange={(e) => setNearHospitalOrSchool(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-blue-light bg-brand-surface border-brand-border"
                  />
                  <label htmlFor="nearHospital" className="text-xs text-white cursor-pointer font-medium">
                    Within 200m of Hospital or School
                  </label>
                </div>
                {nearHospitalOrSchool && (
                  <div className="mt-2 text-[11px] text-white opacity-90 font-mono">
                    Priority elevated to TIER-1 EMERGENCY due to ambulance and school corridor access.
                  </div>
                )}
              </div>
            </div>

            {/* Title & Description inputs */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-white opacity-85 block mb-1">
                  Issue Title:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="civic-input w-full text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-white opacity-85 block mb-1">
                  Observations & Road Notes:
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="civic-input w-full text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="btn-primary text-xs font-semibold px-6 py-2.5"
            >
              <span>Submit Civic Hazard Report</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
