from app.cv.area_estimator import estimate_relative_area
from app.cv.authenticity_detector import assess_authenticity
from app.cv.civic_classifier import classify_issue
from app.cv.duplicate_detector import find_duplicates
from app.cv.image_quality import assess_quality
from app.cv.image_relevance import NON_CIVIC_MESSAGE, screen_relevance
from app.cv.image_similarity import perceptual_hash
from app.cv.pothole_detector import detect_from_area
from app.cv.scene_classifier import classify_scene
from app.cv.severity_classifier import classify_severity
from app.cv.image_validator import validate_image

SKIPPED = "Skipped because image relevance screening rejected this upload."


def _rejected_decision() -> dict:
    return {"outcome": "rejected", "manual_review_required": False, "xp_eligible": False, "auto_verification_eligible": False,
            "verification_allowed": False, "reason": "Non-civic image rejected before damage analysis."}


def _degraded_decision() -> dict:
    # No trained civic classifier exists, so the AI can neither confirm the scene nor self-verify.
    return {"outcome": "manual_review_required", "manual_review_required": True, "xp_eligible": True, "xp_finalization": "only_after_independent_verification",
            "auto_verification_eligible": False, "verification_allowed": True,
            "reason": "Relevance is uncertain and no trained civic classifier is installed; XP stays pending until independent verification."}


def analyze_image(content: bytes, candidate_hashes: list[str] | None = None) -> dict:
    validation, image = validate_image(content)
    if image is None:
        return {"validation": validation, "analysis_status": "rejected", "decision": _rejected_decision()}
    relevance = screen_relevance(image)
    scene = classify_scene(image) if relevance["status"] == "uncertain" else None
    if scene and scene["status"] == "non_civic":
        relevance = {**relevance, "status": "non_civic", "kind": scene["category"], "method": scene["method"], "confidence": scene["confidence"], "reason_code": "NON_CIVIC_IMAGE",
                     "message": NON_CIVIC_MESSAGE, "scene_model": scene, "limitations": scene["limitations"]}
    elif scene and scene["status"] == "civic":
        relevance = {**relevance, "status": "civic", "kind": scene["category"], "method": scene["method"], "confidence": scene["confidence"], "reason_code": None,
                     "message": "Pretrained scene model indicates a civic issue; verify independently.", "scene_model": scene, "limitations": scene["limitations"]}
    elif scene:
        relevance = {**relevance, "scene_model": scene}
    image_hash = perceptual_hash(image)
    quality = assess_quality(image)
    duplicates = find_duplicates(image_hash, candidate_hashes or [])
    if relevance["status"] == "non_civic":
        return {"analysis_status": "rejected_non_civic", "rejection_code": "NON_CIVIC_IMAGE", "message": relevance["message"],
                "validation": validation, "relevance": relevance, "quality": quality,
                "classification": {"status": "skipped", "prediction": None, "confidence": None, "reason": SKIPPED},
                "detection": {"status": "skipped", "detections": [], "reason": SKIPPED},
                "area_estimation": {"method": None, "relative_affected_area": None, "percentage": None, "bounding_boxes": [], "limitations": SKIPPED},
                "severity": None, "authenticity": assess_authenticity(image), "image_hash": image_hash, "duplicates": duplicates,
                "decision": _rejected_decision()}
    area = estimate_relative_area(image)
    if relevance["status"] == "civic":
        classification = {"status": "pretrained_zero_shot", "categories": ["pothole", "road_damage", "garbage", "waterlogging", "streetlight_damage"], "prediction": relevance["kind"],
                          "confidence": relevance["confidence"], "model": relevance["scene_model"]["model"], "limitations": relevance["limitations"]}
        decision = {"outcome": "accepted_pending_verification", "manual_review_required": False, "xp_eligible": True, "xp_finalization": "only_after_independent_verification",
                    "auto_verification_eligible": False, "verification_allowed": True,
                    "reason": "Pretrained scene model indicates a civic issue; the model is not fine-tuned, so XP finalizes only after independent verification."}
    else:
        classification, decision = classify_issue(), _degraded_decision()
    return {"analysis_status": "completed_with_degraded_models", "validation": validation, "relevance": relevance, "quality": quality,
            "classification": classification, "detection": detect_from_area(area), "area_estimation": area,
            "severity": classify_severity(area["relative_affected_area"]), "authenticity": assess_authenticity(image),
            "image_hash": image_hash, "duplicates": duplicates, "decision": decision}
