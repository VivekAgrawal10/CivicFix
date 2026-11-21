import React from 'react';
import { Bot, Sparkles, Trash2, ShieldCheck, Activity } from 'lucide-react';

export default function Header({ onClearChat, messageCount, isConfigured, activeModel }) {
  const displayModel = activeModel ? activeModel.replace('gemini-', 'Gemini ').replace('-', ' ') : 'Gemini 3.5 Flash';
  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        
        {/* Brand & Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-sky-500 to-emerald-400 p-[1.5px] shadow-lg shadow-sky-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Bot className="w-6 h-6 text-sky-400" />
            </div>
            {/* Live Indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-900 ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-sky-200 bg-clip-text text-transparent">
                CIVICBOT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                CivicFix AI
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Your AI Civic Assistant
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Operational Status Pill */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="capitalize">{displayModel}</span>
          </div>

          {/* Clear Conversation Button */}
          <button
            onClick={onClearChat}
            disabled={messageCount === 0}
            title="Clear current conversation"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              messageCount > 0
                ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-800/50 cursor-pointer shadow-sm active:scale-95'
                : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>

      </div>
    </header>
  );
}
