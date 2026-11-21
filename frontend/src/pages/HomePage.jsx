import React from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  Map, 
  ArrowRight, 
  Camera, 
  Layers, 
  CheckCircle2,
  MapPin,
  Clock
} from 'lucide-react';
import { useCivicData } from '../context/CivicDataContext';

export function HomePage() {
  const { incidents, dataSource } = useCivicData();

  // Show 4 recent reports (real ones only)
  const recentReports = incidents.slice(0, 4);
  const total = incidents.length;
  const fixed = incidents.filter((i) => i.status === 'Completed').length;
  const open = total - fixed;
  const confirmed = incidents.filter((i) => i.confirmations > 0).length;
  const stat = (n) => (dataSource === 'live' ? n : '—');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
      
      {/* 1. Clean Welcome Hero */}
      <section className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand-text tracking-tight leading-tight">
          Let's make our streets better.
        </h1>
        <p className="text-sm sm:text-base text-brand-text opacity-85 leading-relaxed">
          Report road damage, find safer travel routes, and see local repairs happen.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/report"
            className="btn-primary text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg shadow-btn"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Report an Issue</span>
          </Link>
          <Link
            to="/map"
            className="btn-secondary text-xs sm:text-sm font-medium px-5 py-2.5 rounded-lg"
          >
            <Map className="w-4 h-4" />
            <span>Live Map</span>
          </Link>
        </div>
      </section>

      {/* 2. Four Small Statistics */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          [stat(total), 'Reports Filed'],
          [stat(open), 'Still Open'],
          [stat(fixed), 'Fixed'],
          [stat(confirmed), 'Citizen Confirmed'],
        ].map(([n, label]) => (
          <div key={label} className="civic-card p-4 text-center">
            <div className="text-2xl font-bold font-mono text-brand-text">{n}</div>
            <span className="text-xs text-brand-text opacity-75 mt-0.5 block">{label}</span>
          </div>
        ))}
      </section>
      {dataSource !== 'live' && <p className="text-center text-[11px] text-brand-text opacity-60 -mt-8">Sign in to see live numbers.</p>}

      {/* 3. How CivicFix Works in 3 Steps */}
      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-brand-text">How it works</h2>
          <p className="text-xs text-brand-text opacity-75">Three simple steps from report to repair.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="civic-card p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-center justify-center text-brand-primary">
              <Camera className="w-4 h-4 text-brand-primary" />
            </div>
            <h3 className="text-sm font-bold text-brand-text">1. Spot and report</h3>
            <p className="text-xs text-brand-text opacity-80 leading-relaxed">
              Take a photo of a pothole, leak, or road damage and submit it with your location.
            </p>
          </div>

          <div className="civic-card p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-center justify-center text-brand-primary">
              <Layers className="w-4 h-4 text-brand-primary" />
            </div>
            <h3 className="text-sm font-bold text-brand-text">2. Smart review</h3>
            <p className="text-xs text-brand-text opacity-80 leading-relaxed">
              Nearby reports are grouped together and prioritized near schools and hospitals.
            </p>
          </div>

          <div className="civic-card p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-center justify-center text-brand-accent">
              <CheckCircle2 className="w-4 h-4 text-brand-accent" />
            </div>
            <h3 className="text-sm font-bold text-brand-text">3. Fixed and confirmed</h3>
            <p className="text-xs text-brand-text opacity-80 leading-relaxed">
              Maintenance crews fix the issue, and local citizens verify the road is safe again.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Recent Local Reports */}
      <section className="civic-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-brand-text">Recent Local Reports</h2>
            <p className="text-xs text-brand-text opacity-75">Civic issues reported around your area.</p>
          </div>
          <Link
            to="/my-reports"
            className="text-xs text-brand-primary hover:underline flex items-center gap-1 font-semibold"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentReports.length === 0 && (
          <p className="text-xs text-brand-text opacity-70 text-center py-4">{dataSource === 'live' ? 'No reports yet. Be the first to report a problem.' : 'Sign in to see recent reports.'}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {recentReports.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <span className="font-semibold text-brand-text block">{item.title}</span>
                <span className="text-brand-text opacity-75 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-brand-text opacity-60" />
                  {item.roadName}
                </span>
                <span className="text-[11px] text-brand-text opacity-60 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-brand-text opacity-50" />
                  {item.reportedAt}
                </span>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-text shrink-0">
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
