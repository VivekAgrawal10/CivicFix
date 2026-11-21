"""Conservative non-civic gate; it is NOT a trained scene classifier.

It rejects only images with strong document/screenshot signatures. Everything
else is ``uncertain`` (never "civic"): with no trained classifier installed, the
service cannot confirm that a photograph shows a civic issue.
"""

import numpy as np
from PIL import Image

METHOD = "heuristic_document_screen_gate"
NON_CIVIC_MESSAGE = "This image does not appear to contain a civic issue. Please upload a photograph of a pothole, damaged road, garbage accumulation or waterlogging."
LIMITATIONS = "Rule-based screen; it does not identify a civic issue and returns uncertain for unrelated natural photographs."

_SIZE = 256
_STRONG_EDGE = 40 / 255  # gradient magnitude regarded as a real edge
_MIN_EDGE_FRACTION = 0.003
_AXIS_TOLERANCE = 0.268  # tan(15 degrees)


def _edge_signals(gray: np.ndarray) -> tuple[float, float]:
    """Return (strong_edge_fraction, axis_aligned_share_of_strong_edges)."""
    gx = np.abs(np.diff(gray, axis=1))[:-1, :]
    gy = np.abs(np.diff(gray, axis=0))[:, :-1]
    magnitude = np.hypot(gx, gy)
    strong = magnitude > _STRONG_EDGE
    strong_fraction = float(strong.mean())
    if not strong.any():
        return strong_fraction, 0.0
    major = np.maximum(gx, gy)[strong]
    minor = np.minimum(gx, gy)[strong]
    return strong_fraction, float((minor <= _AXIS_TOLERANCE * major).mean())


def _local_gradient(gray: np.ndarray) -> np.ndarray:
    gx = np.abs(np.diff(gray, axis=1))[:-1, :]
    gy = np.abs(np.diff(gray, axis=0))[:, :-1]
    return np.hypot(gx, gy)


def _perimeter_mask(size: int, band: float = 0.12) -> np.ndarray:
    width = max(2, int(size * band))
    mask = np.ones((size, size), dtype=bool)
    mask[width:-width, width:-width] = False
    return mask


def compute_signals(image: Image.Image) -> dict:
    rgb = np.asarray(image.convert("RGB").resize((_SIZE, _SIZE)), dtype=np.float32) / 255.0
    luminance = rgb.mean(axis=2)
    # Channel maximum so saturated dark-navy ink counts, unlike a luminance-only threshold.
    ink = rgb.max(axis=2) < 0.55
    bright = luminance > 0.85
    gray = luminance
    strong_fraction, axis_share = _edge_signals(gray)
    gradient = _local_gradient(gray)
    flat = gradient < (6 / 255)
    # Digital screens/graphics are exactly flat; photographs carry sensor noise and texture.
    exact_flat = float((gradient < (2 / 255)).mean())
    flat_bright = float((flat & bright[:-1, :-1]).mean())
    perimeter = _perimeter_mask(_SIZE)
    ink_total = int(ink.sum())
    border_ink_share = float((ink & perimeter).sum() / ink_total) if ink_total else 0.0
    quantised = (rgb * 15).astype(np.int32)
    codes = quantised[..., 0] * 256 + quantised[..., 1] * 16 + quantised[..., 2]
    counts = np.sort(np.bincount(codes.ravel()))[::-1]
    top16_cover = float(counts[:16].sum() / codes.size)
    return {
        "bright_fraction": round(float(bright.mean()), 4),
        "dark_ink_fraction": round(float(ink.mean()), 4),
        "strong_edge_fraction": round(strong_fraction, 4),
        "axis_aligned_edge_share": round(axis_share, 4),
        "flat_bright_fraction": round(flat_bright, 4),
        "border_ink_share": round(border_ink_share, 4),
        "top16_colour_cover": round(top16_cover, 4),
        "exact_flat_fraction": round(exact_flat, 4),
    }


def _result(status: str, kind: str | None, signals: dict, message: str, reason_code: str | None) -> dict:
    return {"status": status, "kind": kind, "method": METHOD, "confidence": None, "reason_code": reason_code,
            "message": message, "signals": signals, "limitations": LIMITATIONS}


def screen_relevance(image: Image.Image) -> dict:
    signals = compute_signals(image)
    has_edges = signals["strong_edge_fraction"] >= _MIN_EDGE_FRACTION
    rectilinear = has_edges and signals["axis_aligned_edge_share"] >= 0.8
    paper = signals["bright_fraction"] >= 0.6 and 0.003 <= signals["dark_ink_fraction"] <= 0.35
    # Framed paper: mostly flat bright canvas whose ink sits in the perimeter (certificate / decorative border),
    # even when the ornament is curved or diagonal and therefore not axis-aligned.
    framed_paper = signals["flat_bright_fraction"] >= 0.55 and signals["border_ink_share"] >= 0.5 and 0.003 <= signals["dark_ink_fraction"] <= 0.35
    if paper and (rectilinear or framed_paper):
        return _result("non_civic", "document", signals, NON_CIVIC_MESSAGE, "NON_CIVIC_IMAGE")
    flat_graphic = has_edges and signals["top16_colour_cover"] >= 0.9 and signals["exact_flat_fraction"] >= 0.9
    if (rectilinear and signals["top16_colour_cover"] >= 0.9 and signals["exact_flat_fraction"] >= 0.7) or flat_graphic:
        return _result("non_civic", "screenshot_or_graphic", signals, NON_CIVIC_MESSAGE, "NON_CIVIC_IMAGE")
    return _result("uncertain", None, signals,
                   "No trained civic-scene classifier is installed; this image is not confirmed as civic and needs manual review.", None)
