"""Model readiness endpoint."""

from fastapi import APIRouter, Request

from app.responses import success
from app.services.model_registry import ModelRegistry


def build_router(registry: ModelRegistry) -> APIRouter:
    router = APIRouter(prefix="/models", tags=["models"])

    @router.get("/status")
    async def model_status(request: Request):
        return success(request, registry.status(), model_status="unavailable")

    return router
