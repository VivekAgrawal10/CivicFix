import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  ArrowRight, 
  Route, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Navigation,
  Wrench,
  Cpu,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { CivicMap } from '../components/CivicMap';
import { useCivicData } from '../context/CivicDataContext';

export function LandingPage() {
  const { incidents, clusters } = useCivicData();

  return (
    <div className="min-h-screen bg-brand-canvas text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-20 border-b border-brand-border bg-brand-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface-elevated border border-brand-border text-xs font-mono mb-6">
              <Sparkles className="w-3.5 h-3.5 text-brand-blue-light" />
              <span className="text-white font-medium">CYBERNAUTS • SATHACK @ THAPAR UNIVERSITY</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              REPORT SMARTER.<br />
              MOVE SAFER.<br />
              REPAIR FASTER.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-white opacity-85 leading-relaxed max-w-2xl">
              CivicFix is an AI-powered civic intelligence platform that transforms public reporting. We classify road hazards with computer vision, automatically steer commuters around dangerous road craters and waterlogging, and cluster complaints into unified municipal repair missions.
            </p>

            {/* Prominent CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/citizen"
                className="btn-primary px-6 py-3 rounded-lg text-sm font-bold shadow-btn flex items-center gap-2"
              >
                <Navigation className="w-4 h-4 text-white" />
                <span>Enter Citizen Portal</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>

              <Link
                to="/admin"
                className="btn-secondary px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <Wrench className="w-4 h-4 text-white" />
                <span>City Operations Admin</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Impact Metrics */}
      <section className="py-10 border-b border-brand-border bg-brand-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="civic-card p-5">
              <div className="flex items-center justify-between text-xs text-white opacity-75 mb-1 font-mono">
                <span>Commuters Protected</span>
                <Route className="w-4 h-4 text-brand-blue-light" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">8,920+</div>
              <p className="text-[11px] text-white opacity-70 mt-1 font-mono">Zero accidents on reroutes</p>
            </div>

            <div className="civic-card p-5">
              <div className="flex items-center justify-between text-xs text-white opacity-75 mb-1 font-mono">
                <span>Duplicate Dispatches</span>
                <Layers className="w-4 h-4 text-brand-blue-light" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">-64%</div>
              <p className="text-[11px] text-white opacity-70 mt-1 font-mono">Via AI Smart Clustering</p>
            </div>

            <div className="civic-card p-5">
              <div className="flex items-center justify-between text-xs text-white opacity-75 mb-1 font-mono">
                <span>Avg. Fix Turnaround</span>
                <Clock className="w-4 h-4 text-brand-blue-light" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">4.2 Hrs</div>
              <p className="text-[11px] text-white opacity-70 mt-1 font-mono">Vs 14 days traditional</p>
            </div>

            <div className="civic-card p-5">
              <div className="flex items-center justify-between text-xs text-white opacity-75 mb-1 font-mono">
                <span>Citizen Trust Quorum</span>
                <CheckCircle2 className="w-4 h-4 text-brand-blue-light" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">96.8%</div>
              <p className="text-[11px] text-white opacity-70 mt-1 font-mono">Closed-loop verified</p>
            </div>
          </div>
        </div>
      </section>

      {/* Six-Stage Workflow */}
      <section className="py-14 border-b border-brand-border bg-brand-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono font-semibold uppercase text-brand-blue-light tracking-wider">
              From Report to Resolution
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              The 6-Stage Connected Civic Workflow
            </h2>
            <p className="text-xs sm:text-sm text-white opacity-80 mt-2">
              Every complaint is continuously tracked from initial photo capture to confirmed road reopening.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { num: '01', title: 'REPORT', desc: 'Citizen photo, GPS location and issue description.' },
              { num: '02', title: 'DETECT', desc: 'AI computer vision estimates crater size & severity.' },
              { num: '03', title: 'CONNECT', desc: 'Nearby reports grouped into unified repair missions.' },
              { num: '04', title: 'PRIORITISE', desc: 'Ranked by crater risk, traffic and school/hospital zones.' },
              { num: '05', title: 'DISPATCH', desc: 'Assigned contractor crew, materials and multi-stop route.' },
              { num: '06', title: 'VERIFY', desc: 'Before/after photos verified by local citizen quorum.' },
            ].map((stage) => (
              <div key={stage.num} className="civic-card p-4 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-brand-blue-light">{stage.num}</span>
                  <h3 className="text-sm font-bold text-white mt-1">{stage.title}</h3>
                  <p className="text-xs text-white opacity-75 mt-1.5 leading-snug">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Map Preview & Key Innovation Spotlight */}
      <section className="py-14 border-b border-brand-border bg-brand-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-mono font-semibold uppercase text-brand-blue-light">
                Hazard-Aware Navigation
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                Detect the issue. Guide commuters around danger.
              </h2>
              <p className="text-sm text-white opacity-85 leading-relaxed">
                When an AI model identifies a severe road crater (&gt;3m diameter) or deep waterlogging, CivicFix calculates an automated safe alternate route, saving commuters suspension damage and delay.
              </p>
              <div className="pt-2">
                <Link
                  to="/citizen/navigation"
                  className="btn-primary text-xs font-semibold px-4 py-2"
                >
                  <span>Explore Navigation Engine</span>
                  <ChevronRight className="w-3.5 h-3.5 text-white" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7">
              <CivicMap
                incidents={incidents}
                clusters={clusters}
                showReroute={true}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-brand-surface border-t border-brand-border text-xs text-white opacity-80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-brand-blue-light" />
            <span className="font-bold text-white">CIVICFIX</span>
            <span>•</span>
            <span>SATHACK @ THAPAR UNIVERSITY</span>
            <span>•</span>
            <span>TEAM CYBERNAUTS</span>
          </div>
          <div>
            <span>Report Smarter • Move Safer • Repair Faster</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
