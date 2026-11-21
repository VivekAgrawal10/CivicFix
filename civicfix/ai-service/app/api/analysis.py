from fastapi import APIRouter, File, Form, Request, UploadFile
from pydantic import BaseModel, Field

from app.business.priority import calculate_priority
from app.business.verification import verify
from app.business.xp import calculate_xp
from app.responses import success
from app.services.analyzer import analyze_image

router = APIRouter(tags=["analysis"])


@router.post("/analyze")
async def analyze(request: Request, image: UploadFile = File(...), candidate_hashes: str = Form(default="")):
    content = await image.read()
    hashes = [value.strip() for value in candidate_hashes.split(",") if value.strip()]
    result = analyze_image(content, hashes)
    accepted = result["analysis_status"] == "completed_with_degraded_models"
    return success(request, result, model_status="degraded" if accepted else "unavailable", status_code=200 if accepted else 422)


class XpRequest(BaseModel):
    severity: str
    quality_ok: bool
    category: str
    trust: float = Field(ge=0, le=1)
    first_report: bool = False
    verified: bool = False
    daily_awarded: int = Field(ge=0)


class PriorityRequest(BaseModel):
    severity: str
    affected_area: float = Field(ge=0, le=1)
    safety_risk: int = Field(ge=0, le=10)
    traffic_impact: int = Field(ge=0, le=10)
    public_exposure: int = Field(ge=0, le=10)
    verified: bool = False
    emergency: bool = False
    location_importance: int = Field(default=0, ge=0, le=10)
    independent_reports: int = Field(default=0, ge=0)
    hours_unresolved: float = Field(default=0, ge=0)


class VerificationRequest(BaseModel):
    population: str
    reporter_id: str
    corroborator_id: str | None = None
    category_match: bool
    distance_m: float = Field(ge=0)
    age_hours: float = Field(ge=0)
    image_independent: bool
    ai_passed: bool
    trust_ok: bool


@router.post("/xp/calculate")
async def xp(request: Request, payload: XpRequest):
    return success(request, calculate_xp(**payload.model_dump()), model_status="unavailable")


@router.post("/priority")
async def priority(request: Request, payload: PriorityRequest):
    return success(request, calculate_priority(**payload.model_dump()), model_status="unavailable")


@router.post("/verify")
async def verification(request: Request, payload: VerificationRequest):
    return success(request, verify(**payload.model_dump()), model_status="unavailable")
