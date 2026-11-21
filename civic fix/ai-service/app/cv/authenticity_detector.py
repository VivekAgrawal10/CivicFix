from PIL import Image


def assess_authenticity(image: Image.Image) -> dict:
    exif = bool(image.getexif())
    return {"status": "inconclusive", "risk": "inconclusive", "signals": {"exif_present": exif}, "limitations": "Missing metadata is common and is not evidence of manipulation; no AI-image detector is installed."}
