from io import BytesIO
from PIL import Image


def test_analysis_endpoint_accepts_image_and_returns_evidence(client):
    image = Image.new("RGB", (80, 80), (125, 125, 125)); out = BytesIO(); image.save(out, "PNG")
    response = client.post("/api/v1/analyze", files={"image": ("road.png", out.getvalue(), "image/png")})
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["analysis_status"] == "completed_with_degraded_models"
    assert body["data"]["classification"]["prediction"] is None


def test_analysis_endpoint_rejects_invalid_image(client):
    response = client.post("/api/v1/analyze", files={"image": ("bad.jpg", b"not-an-image", "image/jpeg")})
    assert response.status_code == 422
    assert response.json()["data"]["analysis_status"] == "rejected"


def test_analysis_endpoint_returns_non_civic_rejection_for_document(client):
    image = Image.new("RGB", (400, 300), "white"); from PIL import ImageDraw
    draw = ImageDraw.Draw(image); draw.rectangle((5, 5, 395, 295), outline="navy", width=10)
    for y in range(50, 250, 30): draw.rectangle((50, y, 350, y + 8), fill="navy")
    out = BytesIO(); image.save(out, "PNG")
    response = client.post("/api/v1/analyze", files={"image": ("certificate.png", out.getvalue(), "image/png")})
    assert response.status_code == 422
    body = response.json()["data"]
    assert body["rejection_code"] == "NON_CIVIC_IMAGE"
    assert body["detection"]["detections"] == []


def test_api_decision_block_forbids_xp_and_verification_for_non_civic_and_requires_review_otherwise(client):
    from PIL import ImageDraw
    cert = Image.new("RGB", (400, 300), "white"); draw = ImageDraw.Draw(cert); draw.rectangle((5, 5, 395, 295), outline="navy", width=10)
    out = BytesIO(); cert.save(out, "PNG")
    rejected = client.post("/api/v1/analyze", files={"image": ("c.png", out.getvalue(), "image/png")}).json()["data"]["decision"]
    assert rejected["xp_eligible"] is False and rejected["verification_allowed"] is False
    road = Image.new("RGB", (80, 80), (125, 125, 125)); out = BytesIO(); road.save(out, "PNG")
    review = client.post("/api/v1/analyze", files={"image": ("r.png", out.getvalue(), "image/png")}).json()["data"]["decision"]
    assert review["manual_review_required"] is True and review["auto_verification_eligible"] is False


def test_priority_endpoint_accepts_location_reports_and_time(client):
    response = client.post("/api/v1/priority", json={"severity": "moderate", "affected_area": 0.1, "safety_risk": 3, "traffic_impact": 3, "public_exposure": 3,
                                                      "location_importance": 8, "independent_reports": 3, "hours_unresolved": 120})
    assert response.status_code == 200
    assert "reporting_time" in response.json()["data"]["components"]
