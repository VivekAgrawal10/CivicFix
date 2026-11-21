"""Offline keyword chat fallback, mounted at /chat for the Express backend (en / pa / hi)."""

from pydantic import BaseModel

from fastapi import APIRouter

from app.services.keyword_chat import generate_chatbot_reply

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    userId: str | None = None
    history: list[dict] | None = None


@router.post("/chat")
def chat(payload: ChatRequest) -> dict:
    lang = payload.language if payload.language in {"en", "pa", "hi"} else "en"
    return {"reply": generate_chatbot_reply(payload.message, lang), "language": lang, "source": "keyword-fallback"}
