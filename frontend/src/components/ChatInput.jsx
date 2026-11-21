import React, { useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Sparkles } from 'lucide-react';

export default function ChatInput({ input, setInput, onSendMessage, isLoading, disabled }) {
  const textareaRef = useRef(null);

  // Auto-resize textarea height as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim() && !disabled) {
        onSendMessage();
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoading && input.trim() && !disabled) {
      onSendMessage();
    }
  };

  return (
    <div className="sticky bottom-0 z-20 bg-gradient-to-t from-slate-950 via-slate-900/95 to-slate-900/0 pt-4 pb-4 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        
        {/* Input Card Container */}
        <form
          onSubmit={handleSubmit}
          className="relative rounded-2xl bg-slate-800/90 border border-slate-700/80 focus-within:border-sky-500/80 focus-within:ring-2 focus-within:ring-sky-500/20 shadow-xl shadow-black/40 backdrop-blur-md transition-all duration-200"
        >
          <div className="flex items-end p-2 sm:p-2.5">
            {/* Multi-line or Single-line Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || isLoading}
              placeholder={disabled ? "Chatbot is offline..." : "Ask CivicBot anything about civic reporting, AI verification, or repair SLAs..."}
              maxLength={2000}
              className="flex-1 max-h-36 bg-transparent text-slate-100 placeholder-slate-400 text-sm sm:text-base px-3 py-2 focus:outline-none resize-none disabled:opacity-50"
            />

            {/* Send Button */}
            <div className="flex items-center space-x-1.5 pl-2 pb-1">
              <button
                type="submit"
                disabled={isLoading || !input.trim() || disabled}
                title="Send message (Enter)"
                className={`p-2.5 rounded-xl font-medium flex items-center justify-center transition-all duration-200 ${
                  input.trim() && !isLoading && !disabled
                    ? 'bg-gradient-to-r from-sky-500 to-brand-600 hover:from-sky-400 hover:to-brand-500 text-white shadow-md shadow-sky-500/25 cursor-pointer active:scale-95'
                    : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Sparkles className="w-5 h-5 animate-spin text-sky-300" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Footer inside input box: Hint and character counter */}
          <div className="flex items-center justify-between px-3.5 pb-2 text-[11px] text-slate-500">
            <span className="hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px]">Enter ↵</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 text-[10px]">Shift + Enter</kbd> for new line
            </span>
            <span className="sm:hidden">Press Enter to send</span>
            <span>{input.length}/2000</span>
          </div>
        </form>

        {/* Civic Disclaimer */}
        <p className="text-[11px] text-slate-500 text-center mt-2 px-2">
          CivicBot is an AI assistant for CivicFix platform guidance. For immediate life-threatening emergencies, dial local municipal emergency helplines.
        </p>

      </div>
    </div>
  );
}
