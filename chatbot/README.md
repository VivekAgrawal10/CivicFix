# CIVICBOT — Your AI Civic Assistant (CivicFix)

CivicBot is an AI-powered conversational civic assistant built for the **CivicFix** platform. It guides citizens through reporting real-world infrastructure problems (such as potholes, waterlogging, broken streetlights, garbage accumulation, and drainage failures), explains how AI verification and severity assessment work, and helps municipal repair contractors understand their workflows.

---

## 🌟 Key Features

- **Conversational AI Powered by Google Gemini**: Built using the official `@google/genai` SDK with `gemini-3.5-flash` (and automatic multi-model fallback to `gemini-3.5-flash-lite` and `gemini-3.8-flash`).
- **Context-Aware Multi-Turn Memory**: Remembers previous turns in the ongoing conversation to answer follow-up inquiries accurately.
- **CivicFix Domain Knowledge**:
  - Step-by-step citizen problem reporting guidance.
  - Explanation of computer vision photo validation and GPS deduplication.
  - Breakdown of severity classifications (*low*, *moderate*, *high*, *critical*) and dynamic priority scoring.
  - Municipal repair contractor workflows, SLAs, and required photographic resolution proof.
  - Locality road health scores and weather-based waterlogging predictions.
- **Safety & Grounding Boundaries**:
  - Politely redirects out-of-scope questions back to civic infrastructure.
  - Never hallucinates fake complaint numbers or claims to alter real database state.
- **Modern, Premium Interface**:
  - Dark-mode glassmorphic theme designed with Tailwind CSS.
  - Rich Markdown rendering for formatted answers (bullet lists, code blocks, bold highlights).
  - One-click suggested questions chips for quick access.
  - Fluid typing animation and live backend connectivity status indicator.
  - Auto-scrolling, response copy-to-clipboard, and conversation clear controls.
- **Security & Reliability**:
  - Backend API key protection (`GEMINI_API_KEY` is strictly held on the server; never exposed to React client).
  - Rate limiting (60 requests / 15 minutes per IP via `express-rate-limit`).
  - Input validation (message size limits and schema validation).

---

## 📁 Project Architecture

```
CIVICFIX CHATBOT/
├── backend/
│   ├── .env                  # Environment secrets (GEMINI_API_KEY)
│   ├── .env.example          # Template environment file
│   ├── .gitignore            # Git exclusion rules
│   ├── package.json          # Express server dependencies & scripts
│   └── server.js             # Express server, Gemini SDK integration & API endpoints
├── frontend/
│   ├── index.html            # Main HTML document with custom typography
│   ├── package.json          # React, Vite & Tailwind dependencies
│   ├── postcss.config.js     # PostCSS configuration
│   ├── tailwind.config.js    # Tailwind color palette & keyframe animations
│   ├── vite.config.js        # Vite bundler configuration & backend API proxy
│   ├── .gitignore            # Frontend git exclusion rules
│   └── src/
│       ├── App.jsx           # Master application container & chat state manager
│       ├── main.jsx          # React DOM entry point
│       ├── index.css         # Global styles & custom scrollbars
│       └── components/
│           ├── Header.jsx             # Top bar with branding, status pill & clear chat
│           ├── WelcomeHero.jsx        # First-time greeting & feature highlights
│           ├── SuggestedQuestions.jsx # Clickable quick-start civic questions
│           ├── ChatMessage.jsx        # User and AI message bubbles with Markdown & copy
│           ├── ChatInput.jsx          # Auto-resizing textarea & send button
│           └── TypingIndicator.jsx    # Animated loading dots
├── .gitignore                # Root repository ignore rules
├── package.json              # Root workspace scripts
└── README.md                 # Complete documentation
```

---

## 🔑 How to Obtain a Google Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click the **"Create API key"** button.
4. Select or create a Google Cloud Project to associate with your key.
5. Copy your newly generated API key.

---

## ⚙️ Configuration

Open `backend/.env` (or copy from `backend/.env.example` if creating a new environment):

```env
# Server Port
PORT=5000

# Google Gemini API Key (Paste your key here)
GEMINI_API_KEY=AIzaSyYourActualKeyGoesHere

# Gemini Model Selection (Defaults to gemini-3.5-flash)
GEMINI_MODEL=gemini-3.5-flash

# Allowed Frontend Origins for CORS
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

> **Note:** The backend has built-in fallback detection: if the API key has not yet been configured, the server returns an informative `503` alert rather than crashing, prompting the user via the frontend banner to add the key.

---

## 🚀 Installation & Running

### Step 1: Install Dependencies

All dependencies for both frontend and backend are already installed in this directory. If you ever need to reinstall:

```bash
# Option A: From root directory
npm run install:all

# Option B: Individually
cd backend && npm install
cd ../frontend && npm install
```

---

### Step 2: Start the Backend Server

Open a terminal window and run:

```bash
cd backend
npm start
```

*Output:*
```
=======================================================
 CivicBot Backend Server running on port 5000
 Health check: http://localhost:5000/api/health
 Chat endpoint: POST http://localhost:5000/api/chat
 Model configured: gemini-2.5-flash
 Gemini Key status: Present
=======================================================
```

---

### Step 3: Start the Frontend Application

Open a second terminal window and run:

```bash
cd frontend
npm run dev
```

*Output:*
```
  VITE v5.4.21  ready in 250 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser and navigate to **`http://localhost:5173`**.

---

## 🧪 Testing the Chatbot

Try asking CivicBot these realistic civic prompts:

1. **Reporting Process**:
   > *"How do I report a pothole on my street?"*
2. **AI Deduplication**:
   > *"What happens if three of my neighbors report the same damaged road?"*
3. **Severity Calculation**:
   > *"How does the AI decide if a problem is 'Critical' vs 'Moderate'?"*
4. **Follow-Up Memory**:
   > First prompt: *"Tell me about waterlogging predictions."*  
   > Follow-up prompt: *"Can contractors see these before it starts raining?"*
5. **Contractor SLA & Verification**:
   > *"How do repair companies prove that a pothole has actually been filled?"*
6. **Out-of-Scope Redirection**:
   > *"Who won the cricket match yesterday?"*  
   > *(Notice how CivicBot politely redirects to civic infrastructure topics)*

---

## 🛡️ API Endpoints Reference

### 1. Health Check
- **URL**: `GET /api/health`
- **Response**:
```json
{
  "status": "healthy",
  "service": "CivicBot API",
  "model": "gemini-2.5-flash",
  "aiConfigured": true,
  "timestamp": "2026-11-21T10:15:00.000Z"
}
```

### 2. Chat Query
- **URL**: `POST /api/chat`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "message": "How does CivicFix verify citizen photos?",
  "history": [
    { "role": "user", "text": "Hello!" },
    { "role": "assistant", "text": "Hello! I am CivicBot, your AI Civic Assistant." }
  ]
}
```
- **Response**:
```json
{
  "success": true,
  "reply": "CivicFix uses computer vision algorithms to verify uploaded photos...",
  "model": "gemini-2.5-flash"
}
