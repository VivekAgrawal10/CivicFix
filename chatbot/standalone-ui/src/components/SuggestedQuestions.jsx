import React from 'react';
import { HelpCircle, ChevronRight, Activity, ShieldCheck, Wrench, AlertCircle, FileSearch } from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: AlertCircle,
    text: "How do I report a pothole?",
    category: "Reporting"
  },
  {
    icon: ShieldCheck,
    text: "How does AI verification work?",
    category: "AI Tech"
  },
  {
    icon: Activity,
    text: "How is severity determined?",
    category: "Severity"
  },
  {
    icon: FileSearch,
    text: "How can I track my complaint?",
    category: "Tracking"
  },
  {
    icon: Wrench,
    text: "How does CivicFix help repair companies?",
    category: "Contractors"
  }
];

export default function SuggestedQuestions({ onSelectQuestion, disabled }) {
  return (
    <div className="w-full max-w-3xl mx-auto my-4 animate-fade-in">
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
        <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
        <span>Suggested Questions</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectQuestion(item.text)}
              disabled={disabled}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-800/60 hover:bg-slate-700/80 active:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/60 hover:border-sky-500/40 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-sky-500/5 group text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform flex-shrink-0" />
              <span>{item.text}</span>
              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
