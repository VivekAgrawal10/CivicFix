import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Copy, Check, Sparkles } from 'lucide-react';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.text) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex items-start gap-3 sm:gap-4 my-4 animate-slide-up ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shadow-md transition-transform ${
          isUser
            ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white'
            : 'bg-slate-800 border border-slate-700/80 text-sky-400'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <div className="relative">
            <Bot className="w-5 h-5 text-sky-400" />
            <Sparkles className="w-2.5 h-2.5 text-emerald-400 absolute -top-1 -right-1" />
          </div>
        )}
      </div>

      {/* Message Bubble Container */}
      <div
        className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Header / Role & Timestamp */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1 px-1">
          <span className="font-semibold text-slate-300">
            {isUser ? 'You' : 'CivicBot'}
          </span>
          <span>•</span>
          <span>
            {message.timestamp
              ? new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Just now'}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={`relative group rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-base leading-relaxed transition-all shadow-md ${
            isUser
              ? 'bg-gradient-to-r from-sky-600 to-brand-600 text-white rounded-tr-none shadow-sky-600/15'
              : message.isError
              ? 'bg-rose-950/40 border border-rose-800/60 text-rose-200 rounded-tl-none shadow-rose-900/10'
              : 'bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-tl-none shadow-slate-900/40 backdrop-blur-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          ) : (
            <div className="prose-civic break-words">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>
          )}

          {/* AI Message Action: Copy Button */}
          {!isUser && !message.isError && (
            <button
              onClick={handleCopy}
              title="Copy answer"
              className="absolute -bottom-3 right-3 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-slate-400 hover:text-sky-300 text-[11px] opacity-0 group-hover:opacity-100 transition-all flex items-center space-x-1 shadow-sm active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
