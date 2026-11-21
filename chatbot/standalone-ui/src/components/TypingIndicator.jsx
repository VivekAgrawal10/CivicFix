import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 sm:gap-4 my-4 animate-fade-in">
      {/* Bot Avatar */}
      <div className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-800 border border-slate-700/80 text-sky-400 flex items-center justify-center shadow-md">
        <Bot className="w-5 h-5 text-sky-400 animate-pulse" />
      </div>

      {/* Bubble with Bouncing Dots */}
      <div className="flex flex-col items-start max-w-[85%]">
        <div className="text-[11px] text-slate-400 mb-1 px-1 flex items-center space-x-1">
          <span className="font-semibold text-slate-300">CivicBot</span>
          <span>•</span>
          <span className="text-sky-400 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 animate-spin" /> Thinking...
          </span>
        </div>

        <div className="rounded-2xl rounded-tl-none px-5 py-3.5 bg-slate-800/80 border border-slate-700/60 shadow-md flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
          <span className="text-xs text-slate-400 font-medium ml-2">Consulting CivicFix Knowledge Base...</span>
        </div>
      </div>
    </div>
  );
}
