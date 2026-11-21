import numpy as np
from PIL import Image


def assess_quality(image: Image.Image) -> dict:
    gray = np.asarray(image.convert("L"), dtype=np.float32)
    # Mean absolute second difference is a lightweight blur indicator, not a camera-quality score.
    laplacian_proxy = float(np.mean(np.abs(np.diff(gray, n=2, axis=0))) + np.mean(np.abs(np.diff(gray, n=2, axis=1))))
    brightness = float(gray.mean())
    suitable = laplacian_proxy >= 2.0 and 20 <= brightness <= 235
    return {"method": "heuristic", "brightness": round(brightness, 2), "sharpness_proxy": round(laplacian_proxy, 2), "suitable_for_inference": suitable}
