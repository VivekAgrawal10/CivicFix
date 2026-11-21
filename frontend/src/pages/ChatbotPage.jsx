import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

// Minimal markdown: **bold**, "- " / "* " bullets, numbered lists, blank-line paragraphs (no HTML injection)
function Markdownish({ text }) {
  const inline = (s) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>
    );
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        const bullet = line.match(/^\s*[-*]\s+(.*)/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/);
        if (bullet) return <div key={i} className="pl-3">• {inline(bullet[1])}</div>;
        if (numbered) return <div key={i} className="pl-3">{numbered[1]}. {inline(numbered[2])}</div>;
        return line.trim() ? <div key={i}>{inline(line)}</div> : <div key={i} className="h-1" />;
      })}
    </div>
  );
}

const LANGS = [['en', 'English'], ['hi', 'हिन्दी'], ['pa', 'ਪੰਜਾਬੀ']];

export function ChatbotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setBusy(true);
    try {
      const r = await api.chat(text, language, history);
      setMessages((m) => [...m, { role: 'assistant', text: r.data.reply, source: r.data.source }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err.message, source: 'error' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">CivicFix Assistant</h1>
          <p className="text-xs sm:text-sm text-brand-text opacity-80 mt-1">Ask us anything about civic issues.</p>
        </div>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="civic-input text-xs w-auto" aria-label="Language">
          {LANGS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
      </div>

      <div className="civic-card p-6 h-[480px] flex flex-col justify-between">
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-brand-surface-elevated border border-brand-border flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-brand-text opacity-80" />
              </div>
              <h2 className="text-sm font-semibold text-brand-text">How can we help you today?</h2>
              <p className="text-xs text-brand-text opacity-60 max-w-sm">Ask about road repairs, reporting guidelines, or local street updates.</p>
              {!user && <p className="text-xs text-amber-900 dark:text-amber-300">Please <Link to="/login" className="underline">sign in</Link> to chat.</p>}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs text-brand-text ${m.role === 'user' ? 'bg-brand-primary !text-brand-primary-text' : 'bg-brand-surface-elevated border border-brand-border'}`}>
                <Markdownish text={m.text} />
                {m.source === 'keyword-fallback' && <div className="mt-1 text-[10px] opacity-50">Basic offline assistant (AI chatbot unavailable)</div>}
              </div>
            </div>
          ))}
          {busy && <div className="text-xs text-brand-text opacity-60 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="pt-4 border-t border-brand-border flex items-center gap-2">
          <input type="text" placeholder="Type your question here..." value={input} onChange={(e) => setInput(e.target.value)}
            className="civic-input flex-1 text-xs" disabled={!user} />
          <button type="submit" disabled={!user || busy} className="btn-primary px-4 py-2 text-xs font-semibold rounded-lg shrink-0 disabled:opacity-60">
            <Send className="w-3.5 h-3.5 text-brand-text" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
