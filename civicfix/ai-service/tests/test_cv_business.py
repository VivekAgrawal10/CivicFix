from io import BytesIO

from PIL import Image, ImageDraw

from app.business.priority import calculate_priority
from app.business.verification import verify
from app.business.xp import calculate_xp
from app.cv.area_estimator import estimate_relative_area
from app.cv.duplicate_detector import find_duplicates
from app.cv.image_similarity import perceptual_hash
from app.services.analyzer import analyze_image


def road_with_pothole(size: int):
    image = Image.new("RGB", (100, 100), (125, 125, 125))
    if size:
        ImageDraw.Draw(image).ellipse((50 - size // 2, 50 - size // 2, 50 + size // 2, 50 + size // 2), fill=(20, 20, 20))
    return image


def image_bytes(image):
    output = BytesIO(); image.save(output, "PNG"); return output.getvalue()


def test_area_heuristic_orders_clean_small_large():
    clean = estimate_relative_area(road_with_pothole(0))["relative_affected_area"]
    small = estimate_relative_area(road_with_pothole(12))["relative_affected_area"]
    large = estimate_relative_area(road_with_pothole(40))["relative_affected_area"]
    assert clean == 0
    assert 0 < small < large


def test_analysis_is_honest_about_unavailable_classifier():
    import numpy as np
    noise = np.random.default_rng(2).normal(0, 3, (100, 100, 3))
    photo = Image.fromarray((np.asarray(road_with_pothole(20), dtype=np.float32) + noise).clip(0, 255).astype('uint8'))
    result = analyze_image(image_bytes(photo))
    assert result["validation"]["valid"] is True
    assert result["classification"]["status"] == "unavailable"
    assert result["classification"]["confidence"] is None
    assert result["detection"]["status"] == "degraded"


def test_duplicate_hash_catches_same_image():
    image_hash = perceptual_hash(road_with_pothole(18))
    assert find_duplicates(image_hash, [image_hash])["duplicate_candidate"] is True


def test_xp_preserves_all_submission_components():
    recommendation = calculate_xp(severity="severe", quality_ok=True, category="pothole", trust=0.9, first_report=True, verified=True, daily_awarded=0)
    assert recommendation["breakdown"]["capped_total"] == sum(value for key, value in recommendation["breakdown"].items() if key != "capped_total")


def test_verification_and_priority_rules():
    assert verify(population="normal", reporter_id="a", corroborator_id="a", category_match=True, distance_m=1, age_hours=1, image_independent=True, ai_passed=True, trust_ok=True)["state"] == "rejected"
    assert verify(population="low", reporter_id="a", corroborator_id=None, category_match=True, distance_m=0, age_hours=0, image_independent=True, ai_passed=True, trust_ok=True)["state"] == "ai_verification_passed"
    assert verify(population="normal", reporter_id="a", corroborator_id="b", category_match=True, distance_m=20, age_hours=1, image_independent=True, ai_passed=True, trust_ok=True)["state"] == "community_verified"
    assert calculate_priority(severity="severe", affected_area=.3, safety_risk=9, traffic_impact=9, public_exposure=8, verified=True)["category"] == "critical"


def test_priority_is_explainable_and_uses_reports_location_and_time():
    base = dict(severity="moderate", affected_area=.1, safety_risk=3, traffic_impact=3, public_exposure=3, verified=False)
    low = calculate_priority(**base)
    high = calculate_priority(**base, location_importance=8, independent_reports=3, hours_unresolved=120)
    assert high["score"] > low["score"]
    assert {"location_importance", "independent_reports", "reporting_time"} <= set(high["components"])
    assert high["components"]["independent_reports"] == 6 and high["components"]["reporting_time"] == 10
