def calculate_priority(*, severity: str, affected_area: float, safety_risk: int, traffic_impact: int, public_exposure: int, verified: bool, emergency: bool = False,
                       location_importance: int = 0, independent_reports: int = 0, hours_unresolved: float = 0.0) -> dict:
    """Explainable additive score; every component is returned so the UI can show why."""
    if emergency:
        return {"score": 100, "category": "critical", "components": {"emergency_override": 100}, "explanation": ["Emergency safety override applied."]}
    components = {
        "severity": {"minor": 10, "moderate": 30, "severe": 55}.get(severity, 0),
        "affected_area": min(20, affected_area * 100),
        "safety_risk": safety_risk * 2,
        "traffic_impact": traffic_impact * 1.5,
        "public_exposure": public_exposure,
        "location_importance": location_importance * 1.0,        # e.g. school / hospital / arterial road proximity, 0-10
        "independent_reports": min(10, max(0, independent_reports - 1) * 3),  # corroborating independent reports beyond the first
        "reporting_time": min(10, hours_unresolved / 24 * 2),   # +2 per unresolved day, capped
        "verified": 10 if verified else 0,
    }
    score = sum(components.values())
    category = "critical" if score >= 80 else "high" if score >= 55 else "medium" if score >= 30 else "low"
    components = {key: round(value, 2) for key, value in components.items()}
    return {"score": round(min(score, 100), 2), "category": category, "components": components,
            "explanation": [f"{key}={value}" for key, value in components.items() if value] + [f"severity={severity}", f"area={affected_area:.1%}", f"verified={verified}"]}
