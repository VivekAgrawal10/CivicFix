def detect_from_area(area: dict) -> dict:
    boxes = area["bounding_boxes"]
    return {"status": "degraded", "method": "heuristic_dark_region", "trained_model": False,
            "detections": [{"label": "dark_road_damage_candidate", "bounding_box": box, "confidence": None} for box in boxes],
            "reason": "No pretrained road-damage detector is installed; candidates are heuristic dark regions, not trained detections."}
