/**
 * AI controller — thin API layer over:
 *   • the CivicFix FastAPI vision service (via services/aiClient.js)
 *   • the CivicBot (Gemini) chatbot service, with a keyword-bot fallback in the AI service
 *   • MySQL aggregations for admin insights and duplicate checks (real data, nothing mocked)
 */
const axios = require('axios');
const Report = require('../models/Report');
const { analyzeBuffer, analyzeImageUrl } = require('../services/aiClient');

const AI_SERVICE_URL = () => (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const CHATBOT_URL = () => (process.env.CHATBOT_URL || 'http://localhost:5001').replace(/\/+$/, '');

let insightsCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

const FALLBACK_MESSAGES = {
  en: 'Sorry, the AI assistant is temporarily unavailable. Please try again later.',
  pa: 'ਮਾਫ਼ ਕਰਨਾ, AI ਸਹਾਇਕ ਅਸਥਾਈ ਤੌਰ ਤੇ ਅਣਉਪਲਬਧ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਬਾਅਦ ਵਿੱਚ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  hi: 'क्षमा करें, AI सहायक अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।',
};

/** POST /api/v1/ai/analyze-image  { imageUrl }  — analyse an already-uploaded image */
const analyzeImage = async (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl is required' });
  const analysis = await analyzeImageUrl(imageUrl);
  if (!analysis.available) {
    return res.status(200).json({ success: false, error: 'AI service unavailable', fallback: true, data: analysis });
  }
  return res.status(200).json({
    success: true,
    // legacy flat fields kept for existing clients
    data: { severity: analysis.severity, category: analysis.category, confidence: analysis.confidence, description: analysis.message, ...analysis },
  });
};

/** POST /api/v1/ai/analyze-upload  multipart `image` — live pre-check before the report is submitted */
const analyzeUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'image file is required (field name "image")' });
  const analysis = await analyzeBuffer(req.file.buffer, { filename: req.file.originalname, mimetype: req.file.mimetype });
  return res.status(200).json({ success: analysis.available && !analysis.rejected, data: analysis });
};

/** POST /api/v1/ai/chat  { message, language, history } */
const chat = async (req, res) => {
  const { message, language = 'en', history = [] } = req.body;
  const userId = req.user && req.user._id;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, message: 'message is required' });
  }
  // 1) CivicBot (Gemini) service
  try {
    const r = await axios.post(`${CHATBOT_URL()}/api/chat`, { message, language, history }, { timeout: 25000 });
    if (r.data && r.data.reply) {
      return res.status(200).json({ success: true, data: { reply: r.data.reply, language, source: 'civicbot-gemini' } });
    }
  } catch (err) {
    console.warn('[AI] CivicBot unavailable, trying keyword fallback:', err.message);
  }
  // 2) Keyword assistant inside the AI service (en/pa/hi, offline)
  try {
    const r = await axios.post(`${AI_SERVICE_URL()}/chat`, { message, language, userId: String(userId || ''), history }, { timeout: 10000 });
    return res.status(200).json({ success: true, data: { reply: r.data.reply, language, source: 'keyword-fallback' } });
  } catch (err) {
    console.error('[AI] chat fallback failed:', err.message);
    return res.status(200).json({
      success: false,
      fallback: true,
      data: { reply: FALLBACK_MESSAGES[language] || FALLBACK_MESSAGES.en, language, source: 'static' },
    });
  }
};

/** GET /api/v1/ai/insights — admin; computed from the reports table (rule-based, no mock numbers) */
const getInsights = async (req, res) => {
  try {
    const now = Date.now();
    if (insightsCache.data && now - insightsCache.fetchedAt < CACHE_TTL_MS) {
      return res.status(200).json({ success: true, cached: true, data: insightsCache.data });
    }
    const since = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const prev = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const [byCategory, prevByCategory, byStatus, hotspots, total] = await Promise.all([
      Report.categoryCounts(since),
      Report.categoryCounts(prev, since),
      Report.statusCounts(),
      Report.hotspots(5),
      Report.count({}),
    ]);
    const prevMap = Object.fromEntries(prevByCategory.map((c) => [c._id, c.count]));
    const topCategories = byCategory.map((c) => ({
      category: c._id,
      count: c.count,
      previousWeek: prevMap[c._id] || 0,
    }));
    const hot = hotspots.map((h) => ({
      area: h.address || `${h._id.lat}, ${h._id.lng}`,
      latitude: h._id.lat,
      longitude: h._id.lng,
      issueCount: h.issueCount,
    }));
    const recommendations = [];
    if (hot[0] && hot[0].issueCount > 1) recommendations.push(`Prioritise a crew visit to ${hot[0].area} (${hot[0].issueCount} open reports nearby).`);
    const rising = topCategories.find((c) => c.count > c.previousWeek && c.count >= 3);
    if (rising) recommendations.push(`${rising.category} reports rose from ${rising.previousWeek} to ${rising.count} week over week; review capacity.`);
    const data = {
      generatedFrom: 'reports table (rule-based SQL aggregation, not a trained model)',
      totalReports: total,
      summary: topCategories.length
        ? `${topCategories.reduce((a, c) => a + c.count, 0)} reports in the last 7 days; most common: ${topCategories[0].category} (${topCategories[0].count}).`
        : 'No reports in the last 7 days.',
      topCategories,
      statusBreakdown: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
      hotspots: hot,
      recommendations,
    };
    insightsCache = { data, fetchedAt: now };
    return res.status(200).json({ success: true, cached: false, data });
  } catch (err) {
    console.error('[AI] getInsights error:', err.message);
    return res.status(503).json({ success: false, message: 'Insights unavailable' });
  }
};

const tokens = (s) => new Set(String(s || '').toLowerCase().split(/\W+/).filter(Boolean));
const jaccard = (a, b) => {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((t) => B.has(t) && inter++);
  return inter / (A.size + B.size - inter);
};

/** POST /api/v1/ai/check-duplicate — nearest active same-category report within 60 m (geo + text similarity) */
const checkDuplicate = async (req, res) => {
  try {
    const { title, description, category, location } = req.body;
    const coords = location && Array.isArray(location.coordinates) ? location.coordinates : null;
    if (!coords || coords.length !== 2) return res.status(400).json({ success: false, message: 'location.coordinates [lng, lat] required' });
    const [lng, lat] = coords.map(Number);
    if (![lng, lat].every(Number.isFinite)) return res.status(400).json({ success: false, message: 'location.coordinates [lng, lat] required' });
    const match = await Report.nearby({
      lat,
      lng,
      radiusM: 60,
      filter: { statusIn: Report.ACTIVE, ...(category ? { category } : {}) },
      limit: 1,
    });
    if (!match.length) return res.status(200).json({ success: true, data: { isDuplicate: false, confidence: 0 } });
    const m = match[0];
    const geo = Math.max(0, 1 - m.distanceM / 60);
    const text = jaccard(title, m.title) * 0.6 + jaccard(description, m.description) * 0.4;
    const confidence = Math.round((geo * 0.6 + text * 0.4) * 100) / 100;
    return res.status(200).json({
      success: true,
      data: { isDuplicate: confidence >= 0.5, duplicateOf: confidence >= 0.5 ? m._id : null, confidence, distanceMeters: Math.round(m.distanceM) },
    });
  } catch (err) {
    console.error('[AI] checkDuplicate error:', err.message);
    return res.status(200).json({ success: false, error: 'Duplicate check unavailable', fallback: true, data: { isDuplicate: false, confidence: 0 } });
  }
};

module.exports = { analyzeImage, analyzeUpload, chat, getInsights, checkDuplicate };
