"""
nlp.py — Multilingual NLP and Chatbot module for CivicFix.
Supports English, Punjabi (Gurmukhi script), and Hindi.
Offline keyword assistant (fallback when the CivicBot Gemini service is unavailable).
Integrated from the backend teammate's ai_service; the mock translator was dropped because it only knew four words.
"""

# Civic chatbot knowledge base in three languages
INTENTS = {
    "report_issue": {
        "en": "To report a new civic issue, click on 'Report an Issue' in the sidebar, fill in the category, upload clear photos, and provide your location.",
        "pa": "ਨਵੀਂ ਸਮੱਸਿਆ ਦੀ ਰਿਪੋਰਟ ਕਰਨ ਲਈ, ਸਾਈਡਬਾਰ ਵਿੱਚ 'ਸਮੱਸਿਆ ਰਿਪੋਰਟ ਕਰੋ' 'ਤੇ ਕਲਿੱਕ ਕਰੋ, ਸ਼੍ਰੇਣੀ ਚੁਣੋ, ਫੋਟੋਆਂ ਅਪਲੋਡ ਕਰੋ ਅਤੇ ਆਪਣਾ ਸਥਾਨ ਦੱਸੋ।",
        "hi": "नई समस्या दर्ज करने के लिए, साइडबार में 'समस्या रिपोर्ट करें' पर क्लिक करें, श्रेणी चुनें, फोटो अपलोड करें और अपना स्थान दर्ज करें।",
    },
    "check_status": {
        "en": "You can track the progress of your submitted complaints under 'My Reports' in the navigation menu.",
        "pa": "ਤੁਸੀਂ ਆਪਣੀਆਂ ਦਰਜ ਕੀਤੀਆਂ ਸ਼ਿਕਾਇਤਾਂ ਦੀ ਸਥਿਤੀ ਨੈਵੀਗੇਸ਼ਨ ਮੀਨੂ ਵਿੱਚ 'ਮੇਰੀਆਂ ਰਿਪੋਰਟਾਂ' ਦੇ ਅਧੀਨ ਵੇਖ ਸਕਦੇ ਹੋ।",
        "hi": "आप अपनी दर्ज की गई शिकायतों की स्थिति नेविगेशन मेनू में 'मेरी रिपोर्ट' के तहत देख सकते हैं।",
    },
    "pothole": {
        "en": "Potholes reported as critical priority are automatically dispatched to municipal contractors within 24 hours.",
        "pa": "ਗੰਭੀਰ ਖੱਡਿਆਂ ਦੀਆਂ ਰਿਪੋਰਟਾਂ 24 ਘੰਟਿਆਂ ਦੇ ਅੰਦਰ ਨਗਰ ਨਿਗਮ ਦੇ ਠੇਕੇਦਾਰਾਂ ਨੂੰ ਭੇਜੀਆਂ ਜਾਂਦੀਆਂ ਹਨ।",
        "hi": "गंभीर गड्ढों की रिपोर्ट 24 घंटे के भीतर नगर निगम के ठेकेदारों को भेज दी जाती है।",
    },
    "garbage": {
        "en": "Garbage overflow reports are monitored by the municipal sanitation department. Emergency cleanups happen daily.",
        "pa": "ਕੂੜੇ ਦੇ ਢੇਰ ਦੀਆਂ ਰਿਪੋਰਟਾਂ ਨਗਰ ਨਿਗਮ ਦੇ ਸਫ਼ਾਈ ਵਿਭਾਗ ਦੁਆਰਾ ਨਿਯਮਿਤ ਤੌਰ ਤੇ ਦੇਖੀਆਂ ਜਾਂਦੀਆਂ ਹਨ।",
        "hi": "कचरे के ढेर की रिपोर्ट की निगरानी नगर निगम के स्वच्छता विभाग द्वारा की जाती है।",
    },
    "greeting": {
        "en": "Hello! I am your CivicFix Assistant. How can I help you with municipal services today?",
        "pa": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਸਿਵਿਕਫਿਕਸ ਸਹਾਇਕ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
        "hi": "नमस्ते! मैं आपका सिविकफिक्स सहायक हूँ। आज मैं आपकी क्या सहायता कर सकता हूँ?",
    },
    "default": {
        "en": "Thank you for reaching out. Please describe your civic issue or question, or check 'Nearby Issues' on the live map.",
        "pa": "ਸੰਪਰਕ ਕਰਨ ਲਈ ਧੰਨਵਾਦ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਸਮੱਸਿਆ ਬਾਰੇ ਦੱਸੋ ਜਾਂ ਲਾਈਵ ਨਕਸ਼ੇ 'ਤੇ ਨੇੜੇ ਦੀਆਂ ਸਮੱਸਿਆਵਾਂ ਦੇਖੋ।",
        "hi": "संपर्क करने के लिए धन्यवाद। कृपया अपनी समस्या बताएं या लाइव मानचित्र पर आस-पास की समस्याएं देखें।",
    },
}

KEYWORDS = {
    "check_status": ["status", "track", "progress", "update", "ਸਥਿਤੀ", "ਅਪਡੇਟ", "स्थिति", "ट्रैक"],
    "report_issue": ["report", "submit", "file", "new", "ਰਿਪੋਰਟ", "ਦਰਜ", "ਸ਼ਿਕਾਇਤ", "शिकायत", "दर्ज"],
    "pothole": ["pothole", "hole", "crater", "road", "ਖੱਡਾ", "ਸੜਕ", "ਗੱਢਾ", "गड्ढा", "सड़क"],
    "garbage": ["garbage", "trash", "waste", "dump", "ਕੂੜਾ", "ਗੰਦਗੀ", "कचरा", "गंदगी", "कूड़ा"],
    "greeting": ["hello", "hi", "hey", "help", "ਸਤਿ", "ਹੈਲੋ", "नमस्ते", "प्रणाम", "हाय"],
}


def generate_chatbot_reply(message: str, language: str = "en") -> str:
    """Generate localized conversational response based on intent matching."""
    lang = language if language in ["en", "pa", "hi"] else "en"
    msg_lower = message.lower().strip()

    matched_intent = "default"
    for intent, words in KEYWORDS.items():
        if any(w in msg_lower for w in words):
            matched_intent = intent
            break

    return INTENTS[matched_intent].get(lang, INTENTS[matched_intent]["en"])
