import numpy as np
from PIL import Image
from scipy import ndimage

DARK_V = 55 / 255
MAX_SATURATION = 0.55
MAX_DARK_BACKGROUND = 0.5   # more dark pixels than this means a dark scene/background, not damage
MIN_CONTRAST = 40 / 255     # candidate must be this much darker than its surroundings
MAX_COMPONENTS = 20


def _box(ys: np.ndarray, xs: np.ndarray) -> dict:
    return {"x": int(xs.min()), "y": int(ys.min()), "width": int(xs.max() - xs.min() + 1), "height": int(ys.max() - ys.min() + 1)}


def estimate_relative_area(image: Image.Image) -> dict:
    """Conservative dark-region heuristic, not semantic segmentation.

    Keeps the corrected HSV guard (V < 55 and saturation < 0.55) and then removes
    regions that are not compact, locally contrasting dark patches: frames and
    decorative borders, thin lines, dark backgrounds and soft shadows.
    """
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    height, width = rgb.shape[:2]
    pixels = height * width
    maximum = rgb.max(axis=2)
    minimum = rgb.min(axis=2)
    saturation = np.divide(maximum - minimum, maximum, out=np.zeros_like(maximum), where=maximum > 0)
    candidate = (maximum < DARK_V) & (saturation < MAX_SATURATION)
    candidate[[0, -1], :] = False
    candidate[:, [0, -1]] = False
    excluded: list[dict] = []
    kept_boxes: list[dict] = []
    kept_pixels = 0
    result_note = "Approximation only; it is not pixel-accurate damage segmentation."

    if candidate.mean() > MAX_DARK_BACKGROUND:
        ys, xs = np.where(candidate)
        excluded.append({"reason": "dark_background", "bounding_box": _box(ys, xs)})
    else:
        labels, count = ndimage.label(candidate, structure=np.ones((3, 3)))
        areas = ndimage.sum(candidate, labels, index=range(1, count + 1)) if count else []
        order = np.argsort(areas)[::-1][:MAX_COMPONENTS] if count else []
        min_area = max(8, int(0.001 * pixels))
        ring_width = max(3, int(0.02 * max(height, width)))
        for index in order:
            area = int(areas[index])
            if area < min_area:
                continue
            mask = labels == (index + 1)
            ys, xs = np.where(mask)
            box = _box(ys, xs)
            span_w, span_h = box["width"] / width, box["height"] / height
            fill = area / (box["width"] * box["height"])
            touches_edge = box["x"] <= 1 or box["y"] <= 1 or box["x"] + box["width"] >= width - 1 or box["y"] + box["height"] >= height - 1
            reason = None
            if touches_edge and (span_w > 0.6 or span_h > 0.6) and fill < 0.4:
                reason = "border_or_frame"
            elif min(box["width"], box["height"]) / max(width, height) < 0.02 and max(span_w, span_h) > 0.3:
                reason = "thin_line"
            elif touches_edge and area / pixels > 0.25:
                reason = "shadow_or_dark_background"
            else:
                ring = ndimage.binary_dilation(mask, iterations=ring_width) & ~candidate
                if not ring.any() or float(maximum[ring].mean() - maximum[mask].mean()) < MIN_CONTRAST:
                    reason = "low_contrast_shadow_or_background"
            if reason:
                excluded.append({"reason": reason, "bounding_box": box})
            else:
                kept_boxes.append(box)
                kept_pixels += area

    ratio = kept_pixels / pixels
    return {"method": "heuristic_dark_region", "heuristic": True, "relative_affected_area": round(ratio, 5), "percentage": round(ratio * 100, 3),
            "bounding_boxes": kept_boxes, "excluded_regions": excluded, "limitations": result_note}
