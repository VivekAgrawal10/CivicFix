"""Pretrained zero-shot scene classifier (CLIP). On automatically when torch + transformers are installed;
CIVICFIX_ENABLE_CLIP=0 switches it off, =1 forces it on.

It is a generic pretrained model, NOT fine-tuned on civic data; its accuracy on CivicFix photos is unverified.
Probabilities are the model's real softmax outputs; nothing is fabricated. If torch/transformers or the weights
are unavailable the classifier reports itself unavailable and the pipeline keeps its heuristic behaviour.
"""
import importlib.util
import os
import threading

from PIL import Image

MODEL_NAME = os.environ.get("CIVICFIX_SCENE_MODEL", "openai/clip-vit-base-patch32")
CIVIC_THRESHOLD = 0.50      # summed probability of all civic categories
REVIEW_THRESHOLD = 0.40     # landfill / dump-site wording must lead before the photo is held for review
NON_CIVIC_THRESHOLD = 0.60  # probability of the single best non-civic category
# prompt -> (is_civic, category). is_civic=None marks a "needs human review" category (cannot be auto-accepted or rejected). Several wordings per category; category scores are summed.
PROMPTS = {
    "a photo of a pothole in a road": (True, "pothole"),
    "a close-up photo of a hole in the asphalt": (True, "pothole"),
    "a photo of a damaged cracked road surface": (True, "road_damage"),
    "a photo of a broken road with cracks and loose gravel": (True, "road_damage"),
    "a photo of garbage and litter piled on a street": (True, "garbage"),
    "a photo of a pile of rubbish on the roadside": (True, "garbage"),
    "a photo of an overflowing garbage bin with waste around it": (True, "garbage"),
    "a photo of a flooded road with standing water": (True, "waterlogging"),
    "a photo of a street flooded with water after heavy rain": (True, "waterlogging"),
    "a photo of a waterlogged road with people and vehicles in floodwater": (True, "waterlogging"),
    "a photo of a broken or damaged street light pole": (True, "streetlight_damage"),
    "a photo of a street lamp that is bent, fallen or hanging with exposed wires": (True, "streetlight_damage"),
    "a photo of a street light that is not working at night": (True, "streetlight_damage"),
    "a photo of a large landfill or waste dump site with a bulldozer": (None, "landfill_dump_site"),
    "an aerial or wide photo of a huge garbage dump covering the ground": (None, "landfill_dump_site"),
    "a photo of a clean undamaged road": (False, "clean_road"),
    "a photo of a certificate or printed document": (False, "document"),
    "a screenshot of a computer screen or a diagram": (False, "screenshot"),
    "a close-up portrait photo of a person": (False, "person"),
    "a photo of an indoor room": (False, "indoor"),
    "a photo of a building, landscape, animal or object": (False, "other_scene"),
}

_lock = threading.Lock()
_state = {"loaded": False, "model": None, "processor": None, "error": None}
_backend = None  # tests may inject a callable(image) -> dict[prompt, probability]


def set_backend(fn) -> None:
    global _backend
    _backend = fn


def _deps_installed() -> bool:
    return importlib.util.find_spec("torch") is not None and importlib.util.find_spec("transformers") is not None


def enabled() -> bool:
    if _backend is not None:
        return True
    flag = os.environ.get("CIVICFIX_ENABLE_CLIP")
    if flag == "0":
        return False
    if flag == "1":
        return True
    return _deps_installed()  # automatic: use CLIP whenever its packages are installed


def preload() -> None:
    """Start loading the CLIP weights in the background so the first photo is not slow (called at service start-up)."""
    if enabled() and _backend is None:
        threading.Thread(target=_load, daemon=True, name="clip-preload").start()


def _load() -> None:
    with _lock:
        if _state["loaded"]:
            return
        _state["loaded"] = True
        try:
            from transformers import CLIPModel, CLIPProcessor
            _state["model"] = CLIPModel.from_pretrained(MODEL_NAME).eval()
            _state["processor"] = CLIPProcessor.from_pretrained(MODEL_NAME)
        except Exception as error:  # missing package, no weights, offline
            _state["error"] = f"{type(error).__name__}: {error}"[:300]


def availability() -> dict:
    if not enabled():
        return {"name": "scene_classifier", "status": "disabled", "reason": "Not installed. Run: pip install -r ai-service/requirements-clip.txt (torch + transformers) and restart the AI service. Until then every photo that is not an obvious document/screenshot goes to manual review." if os.environ.get("CIVICFIX_ENABLE_CLIP") != "0" else "Switched off with CIVICFIX_ENABLE_CLIP=0."}
    if _backend is not None:
        return {"name": "scene_classifier", "status": "available", "reason": "Injected test backend."}
    _load()
    if _state["model"] is None:
        return {"name": "scene_classifier", "status": "unavailable", "reason": _state["error"] or "Model failed to load."}
    return {"name": "scene_classifier", "status": "available", "model": MODEL_NAME, "reason": "Pretrained zero-shot CLIP; not fine-tuned on civic data; accuracy unverified."}


def _probabilities(image: Image.Image) -> dict | None:
    if _backend is not None:
        return _backend(image)
    _load()
    if _state["model"] is None:
        return None
    import torch
    inputs = _state["processor"](text=list(PROMPTS), images=image.convert("RGB"), return_tensors="pt", padding=True)
    with torch.no_grad():
        probs = _state["model"](**inputs).logits_per_image.softmax(dim=1)[0].tolist()
    return dict(zip(PROMPTS, probs))


def classify_scene(image: Image.Image) -> dict | None:
    """Return a decision dict, or None when the model is disabled/unavailable."""
    if not enabled():
        return None
    probs = _probabilities(image)
    if not probs:
        return None
    categories: dict[str, float] = {}
    civic_names: set[str] = set()
    review_names: set[str] = set()
    for prompt, value in probs.items():
        is_civic, name = PROMPTS[prompt]
        categories[name] = categories.get(name, 0.0) + value
        if is_civic:
            civic_names.add(name)
        elif is_civic is None:
            review_names.add(name)
    civic = {n: v for n, v in categories.items() if n in civic_names}
    review = {n: v for n, v in categories.items() if n in review_names}
    other = {n: v for n, v in categories.items() if n not in civic_names and n not in review_names}
    best_civic, best_other = max(civic, key=civic.get), max(other, key=other.get)
    base = {"method": "clip_zero_shot_pretrained", "model": MODEL_NAME, "probabilities": {n: round(v, 4) for n, v in categories.items()},
            "limitations": "Generic pretrained model, not fine-tuned on civic data; accuracy unverified."}
    best_review = max(review, key=review.get)
    if review[best_review] >= REVIEW_THRESHOLD and review[best_review] >= max(civic.values()):
        return {**base, "status": "uncertain", "category": best_review, "confidence": None, "needs_review": True,
                "note": "Looks like a landfill or official dump site; cannot tell it from illegal dumping, so a human must decide."}
    if sum(civic.values()) >= CIVIC_THRESHOLD and civic[best_civic] >= other[best_other]:
        return {**base, "status": "civic", "category": best_civic, "confidence": round(civic[best_civic], 4)}
    if other[best_other] >= NON_CIVIC_THRESHOLD:
        return {**base, "status": "non_civic", "category": best_other, "confidence": round(other[best_other], 4)}
    return {**base, "status": "uncertain", "category": None, "confidence": None}
