from math import hypot


def verify(*, population: str, reporter_id: str, corroborator_id: str | None, category_match: bool, distance_m: float, age_hours: float, image_independent: bool, ai_passed: bool, trust_ok: bool) -> dict:
    if corroborator_id == reporter_id:
        return {"state": "rejected", "reason": "A reporter cannot verify their own report."}
    low_ok = ai_passed and trust_ok
    if population == "low" and low_ok and corroborator_id is None:
        return {"state": "ai_verification_passed", "reason": "Low-activity threshold conditions passed."}
    if not corroborator_id:
        return {"state": "awaiting_second_report", "reason": "Independent corroboration is required."}
    if category_match and distance_m <= 100 and age_hours <= 48 and image_independent:
        return {"state": "community_verified", "reason": "Independent nearby, timely, category-matched evidence passed."}
    return {"state": "manual_review_required", "reason": "Corroboration did not meet independence, distance, time, or category rules."}
