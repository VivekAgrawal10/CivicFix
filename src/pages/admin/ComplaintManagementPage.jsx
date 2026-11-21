import React, { useState } from 'react';
import { 
  Inbox, 
  Search, 
  Filter, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight,
  X,
  Edit3
} from 'lucide-react';
import { useCivicData } from '../../context/CivicDataContext';

export function ComplaintManagementPage() {
  const { incidents, updateIncidentStatus } = useCivicData();
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);

  const filtered = incidents.filter(i => {
    const matchSev = filterSeverity === 'ALL' || i.aiData.severity === filterSeverity;
    const matchCat = filterCategory === 'ALL' || i.category.toLowerCase() === filterCategory.toLowerCase();
    const matchText = 
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.roadName.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchCat && matchText;
  });

  const handleStatusChange = (id, newStatus) => {
    updateIncidentStatus(id, newStatus);
    if (selectedItem && selectedItem.id === id) {
      setSelectedItem({ ...selectedItem, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <Inbox className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>INCIDENT AUDIT & WORKFLOW TRIAGE</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Complaint Management
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Inspect, verify and advance lifecycle states of incoming civic complaints.
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
            Matching: <strong className="text-white">{filtered.length} Complaints</strong>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-white opacity-60 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, corridor, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="civic-input w-full pl-9"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="civic-input w-full"
            >
              <option value="ALL">All Categories</option>
              <option value="Pothole">Pothole</option>
              <option value="Waterlogging">Waterlogging</option>
              <option value="Broken Drain">Broken Drain</option>
              <option value="Road Damage">Road Damage</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="civic-input w-full"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="CAUTION">Caution</option>
              <option value="VERIFYING">Verifying</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints Table / List */}
      <div className="civic-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-brand-surface-elevated border-b border-brand-border text-white opacity-80 uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Title / Category</th>
                <th className="py-3 px-4">Location / Corridor</th>
                <th className="py-3 px-4">AI Crater Span</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filtered.map(item => (
                <tr 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="hover:bg-brand-surface-hover cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-brand-blue-light">{item.id}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white font-sans">{item.title}</div>
                    <div className="text-[10px] text-white opacity-60">{item.category}</div>
                  </td>
                  <td className="py-3 px-4 text-white opacity-80">{item.roadName}</td>
                  <td className="py-3 px-4 text-white">
                    {item.aiData.estimatedDiameterMeters ? `${item.aiData.estimatedDiameterMeters}m` : 'Localized'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.aiData.severity === 'CRITICAL' ? 'bg-red-950 text-white border border-red-800' : 'bg-amber-950 text-white border border-amber-800'
                    }`}>
                      {item.aiData.severity}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-brand-surface-elevated border border-brand-border text-white font-semibold">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      className="btn-secondary text-[10px] py-1 px-2.5"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Audit Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="civic-card-elevated w-full max-w-xl p-6 relative space-y-4">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-brand-surface hover:bg-brand-surface-hover text-white"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="border-b border-brand-border pb-3">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-surface text-white border border-brand-border">
                {selectedItem.id}
              </span>
              <h2 className="text-lg font-bold text-white mt-1.5">{selectedItem.title}</h2>
              <p className="text-xs text-white opacity-80">{selectedItem.roadName}</p>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-white opacity-90">{selectedItem.description}</p>

              {/* Status Update Controls */}
              <div className="civic-card p-4 space-y-2 font-mono">
                <span className="text-xs font-bold text-white block">Update Lifecycle Stage:</span>
                <div className="flex flex-wrap gap-2">
                  {['DISPATCHED', 'REPAIRING', 'VERIFYING', 'RESOLVED'].map(st => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedItem.id, st)}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                        selectedItem.status === st 
                          ? 'bg-brand-blue-light text-white' 
                          : 'bg-brand-surface hover:bg-brand-surface-hover text-white border border-brand-border'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
