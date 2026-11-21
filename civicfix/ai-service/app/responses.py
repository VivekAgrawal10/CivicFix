"""Envelope constructors; endpoints never handcraft response structure."""

from time import perf_counter
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

from app.schemas import ModelStatus


def _meta(request: Request, model_status: ModelStatus) -> dict[str, Any]:
    started_at = getattr(request.state, "started_at", perf_counter())
    return {
        "request_id": getattr(request.state, "request_id", "unknown"),
        "processing_ms": round((perf_counter() - started_at) * 1000, 3),
        "model_status": model_status,
    }


def success(
    request: Request, data: Any, *, model_status: ModelStatus, status_code: int = 200
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"ok": True, "data": data, "meta": _meta(request, model_status), "error": None},
    )


def failure(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: Any | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "ok": False,
            "data": None,
            "meta": _meta(request, "unavailable"),
            "error": {"code": code, "message": message, "details": details},
        },
    )
