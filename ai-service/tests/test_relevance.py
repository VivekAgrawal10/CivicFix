from io import BytesIO

from PIL import Image, ImageDraw

from app.cv.image_relevance import screen_relevance
from app.services.analyzer import analyze_image


def image_bytes(image):
    output = BytesIO(); image.save(output, "PNG"); return output.getvalue()


def certificate_like():
    image = Image.new("RGB", (600, 400), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((12, 12, 588, 388), outline=(5, 30, 75), width=10)
    for y in range(80, 260, 35): draw.rectangle((90, y, 510, y + 8), fill=(5, 30, 75))
    return image


def screenshot_like():
    image = Image.new("RGB", (600, 400), "white")
    draw = ImageDraw.Draw(image)
    for y in range(30, 350, 25): draw.rectangle((30, y, 420, y + 5), fill="black")
    return image


def road(pothole=0):
    image = Image.new("RGB", (160, 120), (125, 125, 125))
    if pothole: ImageDraw.Draw(image).ellipse((80 - pothole // 2, 60 - pothole // 2, 80 + pothole // 2, 60 + pothole // 2), fill=(20, 20, 20))
    return noisy(image, 3)  # real photographs carry sensor noise; perfectly flat images are treated as digital graphics


def test_certificate_is_rejected_before_civic_analysis():
    result = analyze_image(image_bytes(certificate_like()))
    assert result["analysis_status"] == "rejected_non_civic"
    assert result["rejection_code"] == "NON_CIVIC_IMAGE"
    assert result["detection"]["detections"] == []
    assert result["area_estimation"]["relative_affected_area"] is None
    assert result["severity"] is None


def test_screenshot_is_rejected():
    assert screen_relevance(screenshot_like())["status"] == "non_civic"


def test_unrelated_photo_is_uncertain_not_fabricated_as_civic():
    unrelated = Image.new("RGB", (160, 120), (30, 140, 210))
    assert screen_relevance(unrelated)["status"] == "uncertain"


def test_clean_road_and_pothole_sizes_continue_to_analysis():
    for image in (road(), road(14), road(54)):
        assert analyze_image(image_bytes(image))["analysis_status"] == "completed_with_degraded_models"


def test_garbage_and_waterlogging_like_photos_are_not_auto_rejected():
    garbage = Image.new("RGB", (160, 120), (95, 105, 80)); ImageDraw.Draw(garbage).rectangle((30, 45, 100, 105), fill=(50, 90, 30))
    water = Image.new("RGB", (160, 120), (70, 120, 150)); ImageDraw.Draw(water).ellipse((20, 30, 140, 100), fill=(35, 95, 170))
    assert screen_relevance(garbage)["status"] == "uncertain"
    assert screen_relevance(water)["status"] == "uncertain"


# ---- additional regression coverage (synthetic stand-ins; no licensed photo fixtures are bundled) ----
import math

import numpy as np

from app.cv.area_estimator import estimate_relative_area


def noisy(image, sigma=6, seed=1):
    rng = np.random.default_rng(seed)
    data = np.asarray(image, dtype=np.float32) + rng.normal(0, sigma, (image.height, image.width, 3))
    return Image.fromarray(data.clip(0, 255).astype("uint8"))


def ornate_certificate():
    """Curved, non-axis-aligned decorative border on cream paper (the original false-positive scenario)."""
    image = Image.new("RGB", (640, 440), (250, 244, 225)); draw = ImageDraw.Draw(image)
    draw.rectangle((10, 10, 630, 430), outline=(40, 30, 80), width=8)
    for i in range(0, 640, 16):
        for y in (28 + 6 * math.sin(i / 9), 412 - 6 * math.sin(i / 9)): draw.ellipse((i, y, i + 8, y + 8), fill=(60, 40, 110))
    for j in range(0, 440, 16):
        for x in (28 + 6 * math.sin(j / 9), 612 - 6 * math.sin(j / 9)): draw.ellipse((x, j, x + 8, j + 8), fill=(60, 40, 110))
    return image


def dark_mode_screenshot():
    image = Image.new("RGB", (600, 400), (24, 24, 28)); draw = ImageDraw.Draw(image)
    for y in range(30, 350, 30): draw.rectangle((30, y, 380, y + 8), fill=(230, 230, 230))
    draw.rectangle((420, 30, 570, 90), fill=(40, 120, 220))
    return image


def textured_unrelated_photo():
    y, x = np.mgrid[0:240, 0:320]
    data = np.stack([90 + 60 * np.sin(x / 40.0), 120 + 50 * np.cos(y / 30.0), 80 + 40 * np.sin((x + y) / 55.0)], axis=2)
    return noisy(Image.fromarray(data.clip(0, 255).astype("uint8")), sigma=10, seed=3)


def road_photo_with_bright_sky():
    data = np.zeros((300, 400, 3), np.float32)
    data[:150] = (235, 238, 245); data[150:] = (110, 112, 115)
    image = Image.fromarray(data.astype("uint8")); ImageDraw.Draw(image).ellipse((150, 200, 250, 260), fill=(25, 25, 25))
    return noisy(image, sigma=8, seed=5)


def test_ornate_certificate_with_curved_border_is_rejected_with_no_damage_output():
    result = analyze_image(image_bytes(ornate_certificate()))
    assert result["analysis_status"] == "rejected_non_civic"
    assert result["detection"]["detections"] == [] and result["severity"] is None
    assert result["decision"]["xp_eligible"] is False and result["decision"]["verification_allowed"] is False


def test_dark_mode_screenshot_is_rejected():
    assert screen_relevance(dark_mode_screenshot())["kind"] == "screenshot_or_graphic"


def test_unrelated_textured_photo_goes_to_manual_review_not_rejected_or_confirmed():
    result = analyze_image(image_bytes(textured_unrelated_photo()))
    assert result["relevance"]["status"] == "uncertain"
    assert result["relevance"]["confidence"] is None
    assert result["decision"]["outcome"] == "manual_review_required"
    assert result["decision"]["auto_verification_eligible"] is False


def test_real_looking_road_with_bright_sky_is_not_mistaken_for_a_document():
    result = analyze_image(image_bytes(road_photo_with_bright_sky()))
    assert result["relevance"]["status"] == "uncertain"
    assert len(result["detection"]["detections"]) == 1


def test_decorative_border_frame_is_not_a_pothole():
    frame = Image.new("RGB", (200, 150), (125, 125, 125)); ImageDraw.Draw(frame).rectangle((0, 0, 199, 149), outline=(10, 10, 10), width=8)
    area = estimate_relative_area(frame)
    assert area["relative_affected_area"] == 0 and area["bounding_boxes"] == []
    assert area["excluded_regions"][0]["reason"] == "border_or_frame"


def test_shadow_and_dark_background_are_not_potholes():
    shadow = Image.new("RGB", (200, 150), (130, 130, 130)); ImageDraw.Draw(shadow).rectangle((0, 0, 200, 70), fill=(40, 40, 40))
    assert estimate_relative_area(noisy(shadow, 3))["bounding_boxes"] == []
    assert estimate_relative_area(Image.new("RGB", (200, 150), (15, 15, 15)))["bounding_boxes"] == []


def test_small_and_large_potholes_keep_ordering_and_are_labelled_heuristic():
    small, large = (estimate_relative_area(noisy(road(n), 3)) for n in (14, 54))
    assert 0 < small["relative_affected_area"] < large["relative_affected_area"]
    assert large["heuristic"] is True
    detection = analyze_image(image_bytes(road(54)))["detection"]
    assert detection["trained_model"] is False and detection["detections"][0]["confidence"] is None


def test_dark_flowchart_diagram_with_small_text_is_rejected():
    from PIL import ImageFont
    image = Image.new("RGB", (3570, 752), (15, 17, 26)); draw = ImageDraw.Draw(image); font = ImageFont.load_default()
    for i in range(8):
        x = 100 + i * 420
        draw.rounded_rectangle((x, 300, x + 300, 380), 12, fill=(30, 60, 120), outline=(90, 130, 200))
        draw.text((x + 20, 330), "Data ingestion & validation", fill=(220, 225, 235), font=font)
    assert analyze_image(image_bytes(image))["analysis_status"] == "rejected_non_civic"


# ---- optional pretrained scene classifier (injected backend; the real CLIP weights are not exercised here) ----
from app.cv import scene_classifier


def _fake(top, spread=False):
    def backend(_image):
        probs = {p: 0.01 for p in scene_classifier.PROMPTS}
        keys = [p for p, (_, cat) in scene_classifier.PROMPTS.items() if cat == top]
        for key in keys: probs[key] = 0.9 / len(keys) if spread else (0.9 if key == keys[0] else 0.01)
        return probs
    return backend


def test_scene_model_civic_result_is_reported_as_pretrained_with_real_confidence_and_pending_xp():
    scene_classifier.set_backend(_fake("pothole"))
    try:
        result = analyze_image(image_bytes(textured_unrelated_photo()))
    finally:
        scene_classifier.set_backend(None)
    assert result["relevance"]["status"] == "civic"
    assert result["classification"]["status"] == "pretrained_zero_shot" and result["classification"]["prediction"] == "pothole"
    assert result["decision"]["xp_eligible"] is True and result["decision"]["auto_verification_eligible"] is False


def test_scene_model_non_civic_result_rejects_unrelated_photo_with_no_damage_output():
    scene_classifier.set_backend(_fake("person"))
    try:
        result = analyze_image(image_bytes(textured_unrelated_photo()))
    finally:
        scene_classifier.set_backend(None)
    assert result["analysis_status"] == "rejected_non_civic" and result["detection"]["detections"] == [] and result["severity"] is None


def test_scene_model_off_keeps_manual_review(monkeypatch):
    monkeypatch.setenv("CIVICFIX_ENABLE_CLIP", "0")
    assert scene_classifier.classify_scene(textured_unrelated_photo()) is None
    assert scene_classifier.availability()["status"] == "disabled"


def test_scene_model_auto_mode_stays_disabled_without_torch_and_says_how_to_install(monkeypatch):
    monkeypatch.delenv("CIVICFIX_ENABLE_CLIP", raising=False)
    monkeypatch.setattr(scene_classifier, "_deps_installed", lambda: False)
    assert scene_classifier.enabled() is False
    assert "requirements-clip.txt" in scene_classifier.availability()["reason"]


def test_flood_score_spread_across_several_wordings_still_counts_as_waterlogging():
    # Each wording only ~0.30 (below any single-phrase threshold) but the category total is clear.
    scene_classifier.set_backend(_fake("waterlogging", spread=True))
    try:
        result = analyze_image(image_bytes(textured_unrelated_photo()))
    finally:
        scene_classifier.set_backend(None)
    assert result["relevance"]["status"] == "civic" and result["classification"]["prediction"] == "waterlogging"


def test_landfill_scene_is_held_for_manual_review_not_accepted_as_a_garbage_report():
    scene_classifier.set_backend(_fake("landfill_dump_site", spread=True))
    try:
        result = analyze_image(image_bytes(textured_unrelated_photo()))
    finally:
        scene_classifier.set_backend(None)
    assert result["relevance"]["status"] == "uncertain" and result["relevance"]["scene_model"]["category"] == "landfill_dump_site"
    assert result["decision"]["manual_review_required"] is True and result["classification"]["prediction"] is None


def test_streetlight_damage_is_a_civic_category_with_xp_weight():
    from app.business.xp import calculate_xp
    scene_classifier.set_backend(_fake("streetlight_damage", spread=True))
    try:
        result = analyze_image(image_bytes(textured_unrelated_photo()))
    finally:
        scene_classifier.set_backend(None)
    assert result["relevance"]["status"] == "civic" and result["classification"]["prediction"] == "streetlight_damage"
    assert "streetlight_damage" in result["classification"]["categories"]
    assert calculate_xp(severity="minor", quality_ok=True, category="streetlight_damage", trust=0.5, first_report=False, verified=False, daily_awarded=0)["breakdown"]["category_adjustment"] == 15
