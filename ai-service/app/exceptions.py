"""Centralized, non-leaky API error handling."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.responses import failure

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        return failure(
            request,
            status_code=422,
            code="validation_error",
            message="Request validation failed.",
            details=exc.errors(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        code = "not_found" if exc.status_code == 404 else "http_error"
        message = "Resource not found." if exc.status_code == 404 else str(exc.detail)
        return failure(request, status_code=exc.status_code, code=code, message=message)

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception):
        logger.exception("Unhandled service exception", extra={"request_id": request.state.request_id})
        return failure(
            request,
            status_code=500,
            code="internal_error",
            message="An unexpected server error occurred.",
        )
