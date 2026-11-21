"""Request correlation, latency measurement, and completion logging."""

import logging
from time import perf_counter
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id
        request.state.started_at = perf_counter()
        response = await call_next(request)
        processing_ms = round((perf_counter() - request.state.started_at) * 1000, 3)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = str(processing_ms)
        logger.info(
            "Request completed",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "processing_ms": processing_ms,
            },
        )
        return response
