"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.health import build_router as build_health_router
from app.api.router import build_api_router
from app.config import Settings, get_settings
from app.exceptions import register_exception_handlers
from app.logging_config import configure_logging
from app.middleware import RequestContextMiddleware
from app.cv import scene_classifier
from app.services.model_registry import ModelRegistry


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    # Warm up the pretrained CLIP scene classifier in the background when the server starts
    # (no-op when torch/transformers are not installed; not run by tests that skip lifespan).
    scene_classifier.preload()
    yield


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build an app without loading ML artifacts, enabling truthful degradation."""

    settings = settings or get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(title="CivicFix AI Service", version="0.1.0", lifespan=_lifespan)
    app.add_middleware(RequestContextMiddleware)
    registry = ModelRegistry(settings.model_artifact_dir)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(build_health_router(settings))
    app.include_router(chat_router)
    app.include_router(build_api_router(settings, registry))
    register_exception_handlers(app)
    return app


app = create_app()
