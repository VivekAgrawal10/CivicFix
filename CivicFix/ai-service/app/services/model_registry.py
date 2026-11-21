"""Registry for declared model capabilities and their verified runtime state."""

from dataclasses import asdict, dataclass
from pathlib import Path

from app.cv import scene_classifier


@dataclass(frozen=True)
class ModelCapability:
    name: str
    task: str
    status: str
    reason: str


class ModelRegistry:
    """Reports availability only; it neither downloads nor simulates models."""

    _planned_models = (
        ("road_damage_detector", "road damage and pothole detection"),
        ("garbage_detector", "garbage accumulation detection"),
        ("waterlogging_detector", "waterlogging detection"),
        ("severity_classifier", "severity classification"),
        ("authenticity_classifier", "AI-generated/manipulated-image detection"),
    )

    def __init__(self, artifact_dir: Path):
        self._artifact_dir = artifact_dir

    def status(self) -> dict[str, object]:
        # Phase 2 intentionally has no approved artifact loader. An existing file is
        # not enough evidence to declare a model available.
        models = [
            asdict(
                ModelCapability(
                    name=name,
                    task=task,
                    status="unavailable",
                    reason="No verified model artifact has been integrated.",
                )
            )
            for name, task in self._planned_models
        ]
        return {
            "overall_status": "unavailable",
            "artifact_directory": str(self._artifact_dir),
            "models": models,
            # Rule-based components that are really running. They are heuristics, not trained models.
            "scene_classifier": scene_classifier.availability(),
            "heuristics": [
                {"name": "relevance_gate", "kind": "heuristic", "status": "available", "note": "Rejects document/screenshot signatures only; cannot confirm a civic scene."},
                {"name": "dark_region_area_estimator", "kind": "heuristic", "status": "available", "note": "HSV dark-region candidates with frame/shadow/background filters."},
                {"name": "severity_rubric", "kind": "heuristic", "status": "available", "note": "Area-based rubric; not ground truth."},
                {"name": "dhash_duplicate_detector", "kind": "heuristic", "status": "available", "note": "Perceptual-hash similarity evidence only."},
            ],
        }
