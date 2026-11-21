from io import BytesIO

from PIL import Image, UnidentifiedImageError

SUPPORTED = {"JPEG", "PNG", "WEBP"}


def validate_image(content: bytes, max_bytes: int = 8 * 1024 * 1024) -> tuple[dict, Image.Image | None]:
    if not content:
        return {"valid": False, "reason": "Image content is empty."}, None
    if len(content) > max_bytes:
        return {"valid": False, "reason": "Image exceeds 8 MB limit."}, None
    try:
        image = Image.open(BytesIO(content))
        image.verify()
        image = Image.open(BytesIO(content)).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError):
        return {"valid": False, "reason": "File is corrupt or not a supported image."}, None
    if image.format and image.format not in SUPPORTED:
        return {"valid": False, "reason": f"Unsupported image format: {image.format}."}, None
    width, height = image.size
    if width < 64 or height < 64:
        return {"valid": False, "reason": "Image must be at least 64 by 64 pixels."}, None
    return {"valid": True, "format": image.format or "unknown", "width": width, "height": height, "bytes": len(content)}, image
