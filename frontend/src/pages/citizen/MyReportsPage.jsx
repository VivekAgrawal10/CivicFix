import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  X,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function MyReportsPage() {
  const { incidents } = useCivicData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIncident, setSelectedIncident] = useState(null);

  const filtered = incidents.filter(item => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchesSearch = 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.roadName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <FileText className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>CITIZEN COMPLAINT TRACKER</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              My Submitted Reports
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Track real-time progress of all civic hazards filed by you and your community.
            </p>
          </div>

          <div className="text-xs font-mono text-white">
            <span className="px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border">
              Total Recorded: <strong className="text-white">{incidents.length}</strong>
            </span>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-white opacity-60 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Complaint ID (e.g. INC-1041), title, or road..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="civic-input w-full pl-9 text-xs"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="civic-input w-full text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="DISPATCHED">Dispatched to Crew</option>
              <option value="CLUSTERED">Clustered</option>
              <option value="VERIFYING">Awaiting Verification</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedIncident(item)}
            className="civic-card p-4 hover:border-brand-blue-light cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border">
                  {item.id}
                </span>
                <span className="text-xs font-bold text-white">{item.title}</span>
                <span className="text-[10px] text-white opacity-60 font-mono hidden sm:inline">• {item.category}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-white opacity-80">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-brand-blue-light" />
                  {item.roadName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="w-3 h-3 text-white opacity-60" />
                  {item.reportedAt}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
                item.status === 'RESOLVED' 
                  ? 'bg-emerald-950 text-white border border-emerald-800'
                  : item.status === 'VERIFYING'
                  ? 'bg-purple-950 text-white border border-purple-800'
                  : 'bg-amber-950 text-white border border-amber-800'
              }`}>
                {item.status}
              </span>
              <ChevronRight className="w-4 h-4 text-white opacity-60" />
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="civic-card p-8 text-center text-xs text-white opacity-75 font-mono">
            No complaints found matching the current search criteria.
          </div>
        )}
      </div>

      {/* Detail Slideout Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="civic-card-elevated w-full max-w-xl p-6 relative space-y-4">
            <button
              onClick={() => setSelectedIncident(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-brand-surface hover:bg-brand-surface-hover text-white"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="border-b border-brand-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-surface text-white border border-brand-border">
                  {selectedIncident.id}
                </span>
                <span className="text-[10px] font-mono text-white opacity-70">
                  {selectedIncident.category}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1.5">{selectedIncident.title}</h2>
              <p className="text-xs text-white opacity-80">{selectedIncident.roadName}</p>
            </div>

            {selectedIncident.imageUrl && (
              <div className="rounded-lg overflow-hidden border border-brand-border h-48">
                <img 
                  src={selectedIncident.imageUrl} 
                  alt={selectedIncident.title}
                  className="w-full h-full object-cover" 
                />
              </div>
            )}

            <div className="space-y-2 text-xs">
              <p className="text-white opacity-85">{selectedIncident.description}</p>
              
              <div className="civic-card p-3 font-mono space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-white opacity-70">Assigned Cluster:</span>
                  <strong className="text-white">{selectedIncident.clusterId || 'Pending Cluster'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white opacity-70">AI Crater Size:</span>
                  <strong className="text-white">{selectedIncident.aiData.estimatedDiameterMeters || 'N/A'}m</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white opacity-70">Reroute Active:</span>
                  <strong className="text-white">
                    {selectedIncident.aiData.rerouteTriggered ? 'Yes (Commuters Rerouted)' : 'No (Advisory Only)'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-white opacity-70">Current Status:</span>
                  <strong className="text-white">{selectedIncident.status}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedIncident(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
