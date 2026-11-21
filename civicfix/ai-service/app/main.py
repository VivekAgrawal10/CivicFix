"""FastAPI application entry point."""

from fastapi import FastAPI

from app.api.health import build_router as build_health_router
from app.api.router import build_api_router
from app.config import Settings, get_settings
from app.exceptions import register_exception_handlers
from app.logging_config import configure_logging
from app.middleware import RequestContextMiddleware
from app.services.model_registry import ModelRegistry


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build an app without loading ML artifacts, enabling truthful degradation."""

    settings = settings or get_settings()
    configure_logging(settings.log_level)
    app = FastAPI(title="CivicFix AI Service", version="0.1.0")
    app.add_middleware(RequestContextMiddleware)
    registry = ModelRegistry(settings.model_artifact_dir)
    app.include_router(build_health_router(settings))
    app.include_router(build_api_router(settings, registry))
    register_exception_handlers(app)
    return app


app = create_app()
