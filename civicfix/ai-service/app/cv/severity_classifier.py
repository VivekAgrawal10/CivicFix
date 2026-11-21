def classify_severity(relative_area: float, safety_risk: int = 0) -> dict:
    # Weak-label rubric, intentionally deterministic and separate from trained ML.
    score = relative_area * 100 + safety_risk * 5
    if score >= 20:
        label = "severe"
    elif score >= 5:
        label = "moderate"
    else:
        label = "minor"
    return {"status": "heuristic", "label": label, "score": round(score, 3), "rubric": "Affected-area proxy plus optional safety indicator; not ground truth."}
