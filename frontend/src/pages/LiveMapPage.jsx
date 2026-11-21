import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, RefreshCw, Route as RouteIcon } from 'lucide-react';
import { CivicMap } from '../components/CivicMap';
import { useCivicData } from '../context/CivicDataContext';

export function LiveMapPage() {
  const { incidents, lastUpdated, refreshReports, dataSource } = useCivicData();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeIncident, setActiveIncident] = useState(null);
  const [, tick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // keep the "Updated Ns ago" label moving; the data itself refreshes every 15 s in CivicDataContext
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(t); }, []);
  const ago = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000)) : null;
  const refreshNow = async () => { setRefreshing(true); await refreshReports(); setRefreshing(false); };

  const categories = ['ALL', 'Pothole', 'Waterlogging', 'Broken Drain', 'Road Damage', 'Garbage', 'Streetlight'];

  const filteredIncidents = incidents.filter((inc) => {
    if (selectedCategory === 'ALL') return true;
    return inc.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-5">
      
      {/* Page Header & Simple Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Live Road Map</h1>
          <p className="text-xs text-brand-text opacity-80 mt-0.5">
            Real reports from citizens, refreshed automatically every 15 seconds. Tap a marker for details, or switch to Heat Map (top right of the map) to see where problems are concentrated.
          </p>
          <p className="text-[11px] text-brand-text opacity-70 mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dataSource === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {dataSource === 'live' ? `${filteredIncidents.length} report${filteredIncidents.length === 1 ? '' : 's'} · updated ${ago === null ? '…' : ago < 5 ? 'just now' : `${ago}s ago`}` : 'Not connected'}
            {dataSource === 'live' && (
              <button type="button" onClick={refreshNow} className="underline inline-flex items-center gap-1" disabled={refreshing}>
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            )}
          </p>
        </div>

        {/* Clean Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat 
                  ? 'bg-brand-primary text-brand-primary-text font-semibold border border-brand-border' 
                  : 'bg-brand-surface-elevated text-brand-text hover:bg-brand-surface border border-brand-border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Large Clean Map */}
      <div className="civic-card overflow-hidden">
        <CivicMap
          incidents={filteredIncidents}
          clusters={[]}
          selectedIncident={activeIncident}
          onSelectIncident={(inc) => setActiveIncident(inc)}
          showReroute={false}
          showSensitiveZones={false}
          fitToIncidents
          showLocateMe
        />
        {dataSource === 'live' && incidents.length === 0 && (
          <p className="text-xs text-brand-text opacity-75 p-3 text-center">No reports on the map yet. <Link to="/report" className="underline">Report the first problem</Link>.</p>
        )}
        {dataSource !== 'live' && (
          <p className="text-xs text-amber-900 dark:text-amber-300 p-3 text-center">The map shows real reports once you <Link to="/login" className="underline">sign in</Link> and the backend is running.</p>
        )}
      </div>

      {/* Selected Marker Detail Card */}
      {activeIncident && (
        <div className="civic-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            {activeIncident.imageUrl && (
              <img 
                src={activeIncident.imageUrl} 
                alt={activeIncident.title}
                className="w-16 h-16 rounded-lg object-cover border border-brand-border shrink-0" 
              />
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-surface-elevated border border-brand-border text-brand-text font-bold">
                  {activeIncident.id}
                </span>
                <h3 className="text-sm font-bold text-brand-text">{activeIncident.title}</h3>
              </div>
              <p className="text-xs text-brand-text opacity-80 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 opacity-60" />
                {activeIncident.roadName}
              </p>
              <p className="text-[11px] text-brand-text opacity-70">
                {activeIncident.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-brand-surface-elevated border border-brand-border text-brand-text font-semibold">
              Status: {activeIncident.status}
            </span>
            <Link
              to={`/routes?to=${activeIncident.lat},${activeIncident.lng}&toName=${encodeURIComponent(activeIncident.roadName || activeIncident.title)}`}
              className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
            >
              <RouteIcon className="w-3.5 h-3.5" /> Route to here
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
