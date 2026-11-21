"""Operational health endpoint."""

from fastapi import APIRouter, Request

from app.config import Settings
from app.responses import success


def build_router(settings: Settings) -> APIRouter:
    router = APIRouter(tags=["health"])

    @router.get("/health")
    async def health(request: Request):
        return success(
            request,
            {"service": settings.service_name, "environment": settings.environment, "status": "healthy"},
            model_status="unavailable",
        )

    return router
