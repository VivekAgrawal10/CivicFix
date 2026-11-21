import React from 'react';
import { 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  Route, 
  Layers, 
  Activity, 
  Users, 
  Award,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Overview Card */}
      <div className="civic-card p-6 sm:p-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-surface-elevated border border-brand-border text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5 text-brand-blue-light" />
          <span className="text-white">PROJECT OVERVIEW • SATHACK @ THAPAR</span>
        </div>

        <h1 className="text-3xl font-extrabold text-white">
          About CivicFix
        </h1>

        <p className="text-sm sm:text-base text-white opacity-85 leading-relaxed">
          CivicFix is not just another complaint portal. Traditional municipal apps collect citizen grievances into an administrative backlog where complaints disappear into a black hole while commuters remain in danger on the roads.
        </p>

        <p className="text-sm sm:text-base text-white opacity-85 leading-relaxed">
          CivicFix connects citizen reporting directly to <strong>active commuter safety (hazard-aware rerouting)</strong> and <strong>coordinated municipal maintenance (spatial clustering & unified missions)</strong>.
        </p>
      </div>

      {/* The 6-Stage Workflow */}
      <div className="civic-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white font-mono uppercase">
          The 6-Stage Connected Architecture
        </h2>

        <div className="space-y-3 pt-2">
          {[
            {
              step: '01',
              title: 'REPORT',
              desc: 'Citizens capture geocoded photos and descriptions of potholes, waterlogging, or damaged drains.'
            },
            {
              step: '02',
              title: 'DETECT',
              desc: 'Computer vision algorithms estimate crater dimensions. Craters exceeding 3.0m in diameter are automatically classified as Severe/Critical.'
            },
            {
              step: '03',
              title: 'CONNECT',
              desc: 'Nearby and similar complaints are grouped into unified repair clusters to prevent duplicate contractor deployments.'
            },
            {
              step: '04',
              title: 'PRIORITISE',
              desc: 'Issues are ranked based on severity, traffic volume, and proximity to sensitive infrastructure like hospitals and schools.'
            },
            {
              step: '05',
              title: 'DISPATCH',
              desc: 'Authorities assign maintenance crews with pre-calculated materials (asphalt tonnage, pumps) and multi-stop optimized truck routes.'
            },
            {
              step: '06',
              title: 'VERIFY',
              desc: 'Closed-loop trust ensures repairs are not marked done until local citizens inspect before/after photos and vote for quorum.'
            }
          ].map((item) => (
            <div 
              key={item.step}
              className="p-3.5 rounded-lg bg-brand-surface-elevated border border-brand-border flex items-start gap-4"
            >
              <span className="w-8 h-8 rounded-lg bg-brand-blue-light text-white font-mono font-bold flex items-center justify-center shrink-0 text-sm">
                {item.step}
              </span>
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
                <p className="text-xs text-white opacity-80 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Cybernauts & Hackathon Details */}
      <div className="civic-card p-6 space-y-4">
        <h2 className="text-lg font-bold text-white font-mono uppercase">
          Built by Team Cybernauts
        </h2>
        <p className="text-xs sm:text-sm text-white opacity-85 leading-relaxed">
          Developed for <strong>SATHACK at Thapar Institute of Engineering and Technology</strong>. Built to demonstrate production-quality civic technology that bridges the gap between public reporting, commuter protection, and municipal accountability.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs font-mono">
            <span className="text-white opacity-60 block text-[10px]">Track:</span>
            <strong className="text-white">Smart Cities & AI Civic Intelligence</strong>
          </div>
          <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs font-mono">
            <span className="text-white opacity-60 block text-[10px]">Team:</span>
            <strong className="text-white">Cybernauts</strong>
          </div>
          <div className="p-3 rounded-lg bg-brand-surface-elevated border border-brand-border text-xs font-mono">
            <span className="text-white opacity-60 block text-[10px]">Venue:</span>
            <strong className="text-white">Thapar University</strong>
          </div>
        </div>
      </div>

    </div>
  );
}
