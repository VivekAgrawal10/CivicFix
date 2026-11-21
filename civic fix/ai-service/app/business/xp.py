from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class XpBreakdown:
    base: int
    quality_bonus: int
    severity_bonus: int
    category_adjustment: int
    trust_bonus: int
    first_report_bonus: int
    verification_bonus: int
    capped_total: int


def calculate_xp(*, severity: str, quality_ok: bool, category: str, trust: float, first_report: bool, verified: bool, daily_awarded: int, daily_cap: int = 300) -> dict:
    base = 50
    quality_bonus = 15 if quality_ok else 0
    severity_bonus = {"minor": 10, "moderate": 30, "severe": 60}.get(severity, 0)
    category_adjustment = {"pothole": 20, "road_damage": 15, "garbage": 5, "waterlogging": 20, "streetlight_damage": 15}.get(category, 0)
    trust_bonus = 10 if trust >= 0.8 else 0
    first_report_bonus = 10 if first_report else 0
    verification_bonus = 20 if verified else 0
    promised = sum((base, quality_bonus, severity_bonus, category_adjustment, trust_bonus, first_report_bonus, verification_bonus))
    breakdown = XpBreakdown(base, quality_bonus, severity_bonus, category_adjustment, trust_bonus, first_report_bonus, verification_bonus, max(0, min(promised, daily_cap - daily_awarded)))
    return {"status": "finalized_recommendation" if verified else "pending", "breakdown": asdict(breakdown), "ledger_rule": "Persist this exact breakdown at submission; finalization must credit capped_total once."}
