import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
// 5001 so it does not collide with the CivicFix API (5000); the API proxies chat here via CHATBOT_URL
const PORT = process.env.PORT || 5001;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Fallback priority list to guarantee high availability across different API key tiers
const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash'
].filter(Boolean);
const CANDIDATE_MODELS = [...new Set(FALLBACK_MODELS)];

// System prompt defining CivicBot's persona, knowledge base, and behavioral boundaries
const CIVICBOT_SYSTEM_PROMPT = `You are CivicBot, the official AI assistant of CivicFix.

CivicFix is an AI-powered civic infrastructure reporting and management platform designed to streamline municipal problem resolution.

Core Platform Features & Knowledge Base:
1. Citizen Problem Reporting:
   - Citizens report civic issues such as potholes, waterlogging, garbage accumulation, broken streetlights, damaged roads, and drainage problems.
   - Citizens upload evidence photos, select problem categories, describe the issue, and provide GPS coordinates.
2. AI-Powered Image Verification:
   - Computer vision algorithms analyze uploaded images to verify that a real civic issue exists, preventing spam or invalid submissions.
3. Duplicate Report Detection:
   - Spatial clustering algorithms check proximity (GPS latitude/longitude) and visual similarity.
   - Multiple citizens reporting the same physical problem are linked to a single canonical issue, consolidating community reports.
4. AI Severity & Priority Assessment:
   - Severity is rated as: low, moderate, high, or critical.
   - Dynamic priority scores (0-100) factor in severity, traffic density, citizen report counts, and risk to public safety.
5. Smart Navigation & Routing:
   - Helps municipal inspection teams and contractors locate issues using precise GPS coordinates.
6. Repair Company Integration:
   - Verified issues are dispatched to accredited local repair contractors and public works departments.
   - Contractors receive work orders, update status (assigned -> in_progress -> resolved), add remarks, and upload mandatory photographic proof of completion.
7. Historical Infrastructure Analysis:
   - Audits chronic trouble spots (e.g., recurring potholes, roads prone to waterlogging).
   - Tracks contractor performance, resolution turnaround times, and municipal SLA compliance.
8. Road Health Scores:
   - Locality-based infrastructure health indexes (0-100) computed from report density, road damage frequency, and resolution speed.
9. Weather-Based Waterlogging Predictions:
   - Integrates weather forecasts with historical drainage bottlenecks to anticipate flash flooding and pre-dispatch drainage pumps.

Your Personality & Voice:
- Tone: Friendly, intelligent, professional, empathetic, and conversational.
- Communication style: Clear, structured, and concise. Use markdown formatting (bullet points, bold text, numbered lists) to make complex civic workflows easy to understand.

Strict Operational Rules:
- Primary Focus: Focus strictly on CivicFix, civic infrastructure, municipal workflows, road safety, and reporting guidance.
- Polite Redirection: If asked about unrelated topics (e.g., sports, general trivia, entertainment, coding unrelated software), politely redirect the user back to CivicFix and civic infrastructure topics.
- Truthfulness & Grounding: Never invent fake report IDs, tracking numbers, or claim to have accessed real live database records unless provided.
- Status Claims: Never claim an issue has been physically fixed without verified information.
- Distinguish Guidance from Official Verification: Clearly explain that you are an AI assistant providing guidance and platform information.
`;

// Middleware
app.use(express.json({ limit: '1mb' }));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // Allow any localhost port in development
    if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting: 60 requests per 15 minutes per IP
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please wait a few moments before sending another message.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Helper to initialize GoogleGenAI client safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'healthy',
    service: 'CivicBot API',
    model: DEFAULT_MODEL,
    candidateModels: CANDIDATE_MODELS,
    aiConfigured: hasKey,
    timestamp: new Date().toISOString()
  });
});

// POST /api/chat - Main AI Chatbot Endpoint
app.post('/api/chat', chatLimiter, async (req, res) => {
  try {
    const { message, history, language } = req.body;
    const LANGUAGE_NAMES = { pa: 'Punjabi (Gurmukhi script)', hi: 'Hindi (Devanagari script)' };
    const languageNote = LANGUAGE_NAMES[language] ? `\n\nAlways reply in ${LANGUAGE_NAMES[language]}.` : '';

    // 1. Input validation
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a non-empty string.'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Message exceeds maximum allowed length of 2000 characters.'
      });
    }

    // 2. Validate Gemini API Key
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'Google Gemini API key is not configured. Please add GEMINI_API_KEY to backend/.env to activate AI responses.'
      });
    }

    // 3. Format Conversation History for Gemini SDK
    // Expected format in @google/genai: array of { role: 'user' | 'model', parts: [{ text: '...' }] }
    const formattedContents = [];

    if (Array.isArray(history)) {
      for (const item of history) {
        if (!item || !item.role) continue;
        
        const role = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';
        let textContent = '';

        if (typeof item.text === 'string') {
          textContent = item.text;
        } else if (typeof item.content === 'string') {
          textContent = item.content;
        } else if (Array.isArray(item.parts) && item.parts[0]?.text) {
          textContent = item.parts[0].text;
        }

        if (textContent.trim()) {
          formattedContents.push({
            role,
            parts: [{ text: textContent.trim() }]
          });
        }
      }
    }

    // Append current user message
    formattedContents.push({
      role: 'user',
      parts: [{ text: message.trim() }]
    });

    // 4. Call Google Gemini API with smart model fallback chain
    let response = null;
    let usedModel = null;
    let lastError = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction: CIVICBOT_SYSTEM_PROMPT + languageNote,
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        });
        usedModel = modelName;
        break; // Successfully generated content!
      } catch (err) {
        console.warn(`Model ${modelName} failed: ${err.message}. Trying next candidate if available...`);
        lastError = err;
        // Continue loop to try fallback model
      }
    }

    if (!response) {
      throw lastError || new Error('All candidate Gemini models failed to respond.');
    }

    const replyText = response?.text || 'I apologize, but I could not generate a response. Please try rephrasing your question.';

    return res.json({
      success: true,
      reply: replyText,
      model: usedModel
    });

  } catch (error) {
    console.error('Error generating AI response:', error);

    // Differentiate known API errors
    const errorMessage = error?.message || 'An unexpected error occurred while communicating with Google Gemini.';
    let clientMessage = 'CivicBot encountered a temporary issue while processing your question. Please try again.';

    if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('invalid API key')) {
      clientMessage = 'The configured Gemini API key is invalid. Please check your GEMINI_API_KEY in backend/.env.';
    } else if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('429')) {
      clientMessage = 'Gemini API quota exceeded or rate limit reached. Please wait a moment before trying again.';
    } else if (errorMessage.includes('NOT_FOUND') || errorMessage.includes('model not found')) {
      clientMessage = `The requested model is not available for this API key. Current active model is ${DEFAULT_MODEL}.`;
    }

    return res.status(500).json({
      success: false,
      error: clientMessage,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body.'
    });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` CivicBot Backend Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(` Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(` Model configured: ${DEFAULT_MODEL} (Candidates: ${CANDIDATE_MODELS.join(', ')})`);
  console.log(` Gemini Key status: ${process.env.GEMINI_API_KEY ? 'Present' : 'Missing (Set in backend/.env)'}`);
  console.log(`=======================================================`);
});
