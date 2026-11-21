from app.services.keyword_chat import generate_chatbot_reply


def test_status_question_is_not_mistaken_for_reporting():
    assert "My Reports" in generate_chatbot_reply("what is the status of my report", "en")


def test_languages_and_unknown_language_fallback():
    assert generate_chatbot_reply("hello", "pa") != generate_chatbot_reply("hello", "en")
    assert generate_chatbot_reply("hello", "xx") == generate_chatbot_reply("hello", "en")


def test_unknown_message_gets_default_reply():
    assert "describe your civic issue" in generate_chatbot_reply("zzzz qqqq", "en")
