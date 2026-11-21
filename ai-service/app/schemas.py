"""Response contracts shared by API endpoints and exception handlers."""

from typing import Any, Literal

from pydantic import BaseModel, Field


ModelStatus = Literal["available", "degraded", "unavailable"]


class ResponseMeta(BaseModel):
    request_id: str
    processing_ms: float = Field(ge=0)
    model_status: ModelStatus


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ApiResponse(BaseModel):
    ok: bool
    data: Any | None
    meta: ResponseMeta
    error: ErrorDetail | None
