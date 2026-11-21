"""Compose versioned API routes."""

from fastapi import APIRouter

from app.api.analysis import router as analysis_router
from app.api import models
from app.config import Settings
from app.services.model_registry import ModelRegistry


def build_api_router(settings: Settings, registry: ModelRegistry) -> APIRouter:
    router = APIRouter(prefix=settings.api_prefix)
    router.include_router(models.build_router(registry))
    router.include_router(analysis_router)
    return router
