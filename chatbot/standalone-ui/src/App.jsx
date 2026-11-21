import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header.jsx';
import WelcomeHero from './components/WelcomeHero.jsx';
import SuggestedQuestions from './components/SuggestedQuestions.jsx';
import ChatMessage from './components/ChatMessage.jsx';
import ChatInput from './components/ChatInput.jsx';
import TypingIndicator from './components/TypingIndicator.jsx';
import { AlertCircle, RefreshCw, KeyRound } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState({
    checked: false,
    healthy: false,
    aiConfigured: false,
    message: ''
  });

  const messagesEndRef = useRef(null);

  // Check backend health on mount
  const checkBackendHealth = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setServerStatus({
          checked: true,
          healthy: true,
          aiConfigured: data.aiConfigured,
          model: data.model || 'gemini-3.5-flash',
          message: data.aiConfigured
            ? 'Backend connected and Gemini AI active.'
            : 'Backend running, but GEMINI_API_KEY is not configured in backend/.env.'
        });
      } else {
        setServerStatus({
          checked: true,
          healthy: false,
          aiConfigured: false,
          message: 'Backend server returned an error.'
        });
      }
    } catch (err) {
      // Backend not running on 5000
      setServerStatus({
        checked: true,
        healthy: false,
        aiConfigured: false,
        message: 'Could not connect to CivicBot backend on port 5000. Ensure the server is started.'
      });
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Smooth scroll to bottom when messages or typing state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Format conversational history to send to backend for multi-turn memory
  const getConversationHistory = () => {
    return messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role,
        text: m.text
      }));
  };

  const handleSendMessage = async (textToSend) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isLoading) return;

    // Reset input
    setInput('');

    // Create user message object
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date().toISOString()
    };

    // Update messages UI
    const currentHistory = getConversationHistory();
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          history: currentHistory
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to receive response from CivicBot.');
      }

      if (data.model) {
        setServerStatus((prev) => ({ ...prev, model: data.model }));
      }

      // Add AI response
      const botMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.reply,
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `⚠️ **Error:** ${error.message}\n\n*If you haven't set up your API key yet, add your \`GEMINI_API_KEY\` to \`backend/.env\` and restart the server.*`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-sky-500 selection:text-white">
      
      {/* Top Navigation Header */}
      <Header
        onClearChat={handleClearChat}
        messageCount={messages.length}
        isConfigured={serverStatus.healthy && serverStatus.aiConfigured}
        activeModel={serverStatus.model}
      />

      {/* Backend API Configuration Alert Banner (if needed) */}
      {serverStatus.checked && (!serverStatus.healthy || !serverStatus.aiConfigured) && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-2.5 text-xs text-amber-200">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                {!serverStatus.healthy
                  ? "CivicBot Backend is offline. Start the backend with `npm start` inside the `backend` folder."
                  : "Google Gemini API key required: Place your `GEMINI_API_KEY` in `backend/.env` to enable live AI responses."}
              </span>
            </div>
            <button
              onClick={checkBackendHealth}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 border border-amber-700/60 text-amber-100 font-medium transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Scroll Container */}
      <main className="flex-1 flex flex-col justify-between max-w-3xl w-full mx-auto px-4 sm:px-6 pt-4 pb-2">
        
        {/* Messages List or Welcome Hero */}
        <div className="flex-1">
          {messages.length === 0 ? (
            <div className="py-6">
              <WelcomeHero onSelectPrompt={handleSendMessage} />
              <SuggestedQuestions
                onSelectQuestion={handleSendMessage}
                disabled={isLoading}
              />
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {isLoading && <TypingIndicator />}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

      </main>

      {/* Fixed Bottom Input Area */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSendMessage={() => handleSendMessage()}
        isLoading={isLoading}
        disabled={false}
      />

    </div>
  );
}
