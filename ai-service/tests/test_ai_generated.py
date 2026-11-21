import struct
import zlib
from io import BytesIO

import numpy as np
from PIL import Image

from app.cv.authenticity_detector import assess_authenticity
from app.services.analyzer import analyze_image


def photo(size=(320, 240), seed=1):
    rng = np.random.default_rng(seed)
    base = np.full((size[1], size[0], 3), 125, dtype=np.int16) + rng.integers(-6, 7, (size[1], size[0], 3))
    return Image.fromarray(np.clip(base, 0, 255).astype("uint8"))


def png_bytes(img, text=None, itxt=None):
    out = BytesIO(); img.save(out, "PNG"); data = out.getvalue()
    extra = b""
    def chunk(t, body): return struct.pack(">I", len(body)) + t + body + struct.pack(">I", zlib.crc32(t + body) & 0xFFFFFFFF)
    for k, v in (text or {}).items(): extra += chunk(b"tEXt", k.encode() + b"\x00" + v.encode("latin-1"))
    for k, v in (itxt or {}).items(): extra += chunk(b"iTXt", k.encode() + b"\x00\x01\x00\x00\x00" + zlib.compress(v.encode()))
    iend = data.rfind(b"\x00\x00\x00\x00IEND")
    return data[:iend] + extra + data[iend:]


def jpeg_with_segment(img, marker, payload):
    out = BytesIO(); img.save(out, "JPEG"); data = out.getvalue()
    seg = b"\xff" + bytes([marker]) + struct.pack(">H", len(payload) + 2) + payload
    return data[:2] + seg + data[2:]


def jpeg_with_camera(img):
    exif = Image.Exif(); exif[271] = "Apple"; exif[272] = "iPhone 14"
    exif.get_ifd(0x8769)[36867] = "2026:11:20 10:11:12"
    out = BytesIO(); img.save(out, "JPEG", exif=exif); return out.getvalue()


def test_stable_diffusion_png_parameters_are_rejected():
    data = png_bytes(photo(), text={"parameters": "a pothole on a road\nSteps: 20, Sampler: Euler a, CFG scale: 7, Seed: 1"})
    r = analyze_image(data)
    assert r["analysis_status"] == "rejected_ai_generated" and r["rejection_code"] == "AI_GENERATED_IMAGE"
    assert r["authenticity"]["generator"] == "Stable Diffusion" and r["decision"]["outcome"] == "rejected"
    assert "AI-generated" in r["message"]


def test_xmp_digital_source_type_in_jpeg_is_rejected():
    xmp = b"http://ns.adobe.com/xap/1.0/\x00<x:xmpmeta><rdf:Description Iptc4xmpExt:DigitalSourceType='http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'/></x:xmpmeta>"
    r = analyze_image(jpeg_with_segment(photo(), 0xE1, xmp))
    assert r["analysis_status"] == "rejected_ai_generated"


def test_c2pa_with_openai_claim_is_rejected_and_names_generator():
    r = assess_authenticity(photo(), jpeg_with_segment(photo(), 0xEB, b"JP\x00\x00jumbc2pa claim_generator OpenAI DALL-E 3 trainedAlgorithmicMedia"))
    assert r["ai_generated"] and r["content_credentials_present"] and r["generator"] == "DALL-E / OpenAI"


def test_midjourney_in_png_itxt_xmp_is_rejected():
    data = png_bytes(photo(), itxt={"XML:com.adobe.xmp": "<x:xmpmeta>Midjourney Job ID: abc</x:xmpmeta>"})
    assert analyze_image(data)["rejection_code"] == "AI_GENERATED_IMAGE"


def test_comfyui_workflow_is_rejected():
    data = png_bytes(photo(), text={"prompt": '{"3": {"class_type": "KSampler"}}', "workflow": "{}"})
    assert assess_authenticity(photo(), data)["generator"] == "ComfyUI"


def test_plain_photo_is_not_flagged():
    out = BytesIO(); photo().save(out, "JPEG")
    r = assess_authenticity(photo(), out.getvalue())
    assert not r["ai_generated"] and r["status"] == "inconclusive"


def test_camera_photo_is_recognised_and_not_rejected():
    r = assess_authenticity(photo(), jpeg_with_camera(photo()))
    assert not r["ai_generated"] and r["status"] == "camera_original" and r["camera"]["model"] == "iPhone 14"


def test_c2pa_without_ai_claim_is_only_noted():
    r = assess_authenticity(photo(), jpeg_with_segment(photo(), 0xEB, b"JP\x00\x00jumbc2pa claim_generator Leica capture"))
    assert not r["ai_generated"] and r["content_credentials_present"]


def test_random_pixel_bytes_never_trigger():
    # the word can sit inside compressed pixel data; only metadata regions are scanned
    out = BytesIO(); photo().save(out, "JPEG"); data = out.getvalue()
    data = data[:-2] + b"midjourney openai trainedAlgorithmicMedia" + data[-2:]
    assert not assess_authenticity(photo(), data)["ai_generated"]


def test_generic_png_at_generator_size_without_camera_goes_to_manual_review():
    img = photo((1024, 1024))
    r = analyze_image(png_bytes(img))
    assert r["authenticity"]["status"] == "suspicious"
    assert r["decision"]["manual_review_required"] is True and r["decision"]["outcome"] != "rejected"


def test_truncated_or_garbage_container_does_not_crash():
    assert assess_authenticity(photo(), b"\xff\xd8\xff\xe1\x00")["ai_generated"] is False
    assert assess_authenticity(photo(), b"\x89PNG\r\n\x1a\n\x00\x00")["ai_generated"] is False


# ── v2 hardening: the cases real generators produce ────────────────────────────────────────────
def jpeg_with_user_comment(img, comment_bytes):
    exif = Image.Exif()
    exif.get_ifd(0x8769)[37510] = comment_bytes
    out = BytesIO(); img.save(out, "JPEG", exif=exif); return out.getvalue()


def test_stable_diffusion_webui_jpeg_utf16_user_comment_is_rejected():
    params = "a pothole on a road\nNegative prompt: blurry\nSteps: 20, Sampler: Euler a, CFG scale: 7, Seed: 1"
    data = jpeg_with_user_comment(photo(), b"UNICODE\x00" + params.encode("utf-16-be"))
    result = assess_authenticity(Image.open(BytesIO(data)), data)
    assert result["ai_generated"] and result["generator"] == "Stable Diffusion"


def test_c2pa_string_split_across_app11_segments_is_still_found():
    img = photo()
    out = BytesIO(); img.save(out, "JPEG"); data = out.getvalue()
    marker = b"http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"
    cut = len(marker) // 2
    def app11(n, body):
        payload = b"JP\x00\x01" + struct.pack(">I", n) + body
        return b"\xff\xeb" + struct.pack(">H", len(payload) + 2) + payload
    segs = app11(1, b"....jumb c2pa ...." + marker[:cut]) + app11(2, marker[cut:] + b"....")
    data = data[:2] + segs + data[2:]
    result = assess_authenticity(Image.open(BytesIO(data)), data)
    assert result["ai_generated"], result["signals"]


def test_xmp_appended_after_the_end_of_the_image_is_found():
    out = BytesIO(); photo().save(out, "JPEG")
    xmp = b'<x:xmpmeta><rdf:Description Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia"/></x:xmpmeta>'
    data = out.getvalue() + xmp
    result = assess_authenticity(Image.open(BytesIO(data)), data)
    assert result["ai_generated"]


def test_meta_ai_and_generic_labels_in_metadata():
    for label in (b"Imagined with AI", b"AI-generated image", b"Created with AI"):
        data = jpeg_with_segment(photo(), 0xE1, b"http://ns.adobe.com/xap/1.0/\x00<x:xmpmeta>" + label + b"</x:xmpmeta>")
        assert assess_authenticity(Image.open(BytesIO(data)), data)["ai_generated"], label


def test_ordinary_comments_do_not_trigger_the_check():
    for comment in (b"UNICODE\x00" + "holiday in goa, taken with my phone".encode("utf-16-be"), b"ASCII\x00\x00\x00hello world"):
        data = jpeg_with_user_comment(photo(), comment)
        assert not assess_authenticity(Image.open(BytesIO(data)), data)["ai_generated"]


def test_analysis_reports_the_checker_version():
    data = png_bytes(photo(), text={"parameters": "x\nSteps: 20, Sampler: Euler a, CFG scale: 7"})
    result = analyze_image(data)
    assert result["authenticity"]["version"] == "metadata-v2" and result["rejection_code"] == "AI_GENERATED_IMAGE"
