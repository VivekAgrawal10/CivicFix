import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  Layers, 
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { CivicMap } from '../../components/CivicMap';
import { useCivicData } from '../../context/CivicDataContext';

export function LiveHazardMapPage() {
  const { incidents, clusters, weatherAlertActive } = useCivicData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [activeIncident, setActiveIncident] = useState(incidents[0] || null);

  const categories = ['ALL', 'Pothole', 'Waterlogging', 'Broken Drain', 'Road Damage'];
  const severities = ['ALL', 'CRITICAL', 'HIGH', 'CAUTION', 'VERIFYING'];

  const filteredIncidents = incidents.filter(inc => {
    const matchesCategory = selectedCategory === 'ALL' || inc.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSeverity = selectedSeverity === 'ALL' || inc.aiData.severity === selectedSeverity;
    const matchesSearch = 
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.roadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.locality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSeverity && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="civic-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <span className="text-xs font-mono font-semibold text-brand-blue-light uppercase tracking-wider">
              GIS SATELLITE & SENSOR TELEMETRY
            </span>
            <h1 className="text-2xl font-bold text-white mt-0.5">
              Live Civic Hazard Map
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Real-time map tracking road damage, standing water, and school/hospital safety zones.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-white">
            <span className="px-2 py-1 rounded bg-brand-surface-elevated border border-brand-border">
              Displaying: <strong className="text-white">{filteredIncidents.length} Hazards</strong>
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-white opacity-60 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by street, locality, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="civic-input w-full pl-9"
            />
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-brand-blue-light text-white' 
                    : 'bg-brand-surface-elevated hover:bg-brand-surface text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="civic-input text-xs w-full sm:w-auto"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical (&gt;3m)</option>
              <option value="HIGH">High Risk</option>
              <option value="CAUTION">Caution</option>
              <option value="VERIFYING">Verifying</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Map + Selected Hazard Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* The Leaflet Map Component (8 Cols) */}
        <div className="lg:col-span-8">
          <CivicMap
            incidents={filteredIncidents}
            clusters={clusters}
            selectedIncident={activeIncident}
            onSelectIncident={(inc) => setActiveIncident(inc)}
            weatherAlertActive={weatherAlertActive}
            showReroute={true}
          />
        </div>

        {/* Selected Hazard Details Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          {activeIncident ? (
            <div className="civic-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-brand-border pb-3">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border font-bold">
                    {activeIncident.id}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">
                    {activeIncident.title}
                  </h3>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  activeIncident.aiData.severity === 'CRITICAL' 
                    ? 'bg-red-950 text-white border border-red-800' 
                    : 'bg-amber-950 text-white border border-amber-800'
                }`}>
                  {activeIncident.aiData.severity}
                </span>
              </div>

              {/* Photo Preview */}
              {activeIncident.imageUrl && (
                <div className="relative rounded-lg overflow-hidden border border-brand-border h-40">
                  <img 
                    src={activeIncident.imageUrl} 
                    alt={activeIncident.title}
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                    Verified Citizen Capture
                  </div>
                </div>
              )}

              {/* Descriptions & Road Context */}
              <div className="space-y-2 text-xs">
                <p className="text-white opacity-85">{activeIncident.description}</p>
                <div className="p-2.5 rounded-lg bg-brand-surface-elevated border border-brand-border space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-white opacity-70">Corridor:</span>
                    <strong className="text-white">{activeIncident.roadName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white opacity-70">Estimated Span:</span>
                    <strong className="text-white">
                      {activeIncident.aiData.estimatedDiameterMeters ? `${activeIncident.aiData.estimatedDiameterMeters} meters` : 'Localized'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white opacity-70">AI Confidence:</span>
                    <strong className="text-white">{activeIncident.aiData.confidence}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white opacity-70">Status:</span>
                    <strong className="text-white">{activeIncident.status}</strong>
                  </div>
                </div>

                {activeIncident.isRural && (
                  <div className="p-2 rounded bg-amber-950/50 border border-amber-800 text-[11px] text-white">
                    🌾 <strong>Low-Density Locality:</strong> 1 report validated directly by AI photo authenticity without duplicate confirmations.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="civic-card p-6 text-center text-xs text-white opacity-80">
              Click any hazard pin on the map to view detailed telemetry.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
