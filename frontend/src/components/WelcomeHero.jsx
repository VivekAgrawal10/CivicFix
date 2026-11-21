import React from 'react';
import { Sparkles, MapPin, Camera, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function WelcomeHero({ onSelectPrompt }) {
  const capabilities = [
    {
      icon: Camera,
      title: 'AI Photo Verification',
      desc: 'Validates real civic damage and filters non-civic media automatically.'
    },
    {
      icon: MapPin,
      title: 'GPS Deduplication',
      desc: 'Consolidates multiple complaints about the same pothole or broken road.'
    },
    {
      icon: AlertTriangle,
      title: 'Severity Scoring',
      desc: 'Classifies issues from low to critical to prioritize urgent road repairs.'
    },
    {
      icon: Zap,
      title: 'Contractor Dispatch',
      desc: 'Connects verified reports directly to municipal repair teams.'
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center py-6 sm:py-10 px-4 animate-fade-in max-w-2xl mx-auto">
      
      {/* Visual Badge */}
      <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/10 via-brand-500/10 to-emerald-500/10 border border-sky-500/20 text-xs font-medium text-sky-300 mb-5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
        <span>Welcome to CivicFix AI Assistant</span>
      </div>

      {/* Main Title */}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-3">
        How can I help with your <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Civic Infrastructure</span> today?
      </h2>

      {/* Description */}
      <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl mb-8">
        I'm CivicBot, your dedicated civic guide. I can guide you through reporting civic hazards, explain how AI verification works, break down repair SLAs, or assist municipal contractors.
      </p>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {capabilities.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-200 group"
            >
              <div className="flex items-center space-x-2.5 mb-1.5">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs sm:text-sm font-semibold text-slate-200">
                  {item.title}
                </h4>
              </div>
              <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>

    </div>
  );
}
