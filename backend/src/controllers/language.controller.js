const axios = require('axios');

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

// GET /api/v1/languages
const getLanguages = async (req, res) => {
  res.json({ success: true, data: LANGUAGES });
};

// POST /api/v1/translations/translate
const translate = async (req, res, next) => {
  try {
    const { text, fromLang, toLang } = req.body;

    if (!text || !fromLang || !toLang) {
      return res.status(400).json({ success: false, message: 'text, fromLang, and toLang are required.' });
    }

    const validLangs = ['en', 'pa', 'hi'];
    if (!validLangs.includes(fromLang) || !validLangs.includes(toLang)) {
      return res.status(400).json({ success: false, message: 'Invalid language code. Use en, pa, or hi.' });
    }

    if (fromLang === toLang) {
      return res.json({ success: true, translatedText: text, fromLang, toLang, source: 'passthrough' });
    }

    // Try AI service if configured
    const aiServiceUrl = process.env.AI_SERVICE_URL;
    if (aiServiceUrl) {
      try {
        const response = await axios.post(
          `${aiServiceUrl}/translate`,
          { text, from_lang: fromLang, to_lang: toLang },
          { timeout: 8000 }
        );
        const translatedText = response.data.translated_text || response.data.translatedText || text;
        return res.json({ success: true, translatedText, fromLang, toLang, source: 'ai_service' });
      } catch (aiError) {
        console.warn(`AI translation service unavailable: ${aiError.message} — falling back to original text`);
      }
    }

    // Fallback: return original text unchanged
    // IMPORTANT: We NEVER silently modify the stored complaint text.
    return res.json({
      success: true,
      translatedText: text,
      fromLang,
      toLang,
      source: 'fallback',
      note: 'Translation service unavailable. Original text returned unchanged.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLanguages, translate };
