def test_model_status_is_truthful_when_no_models_are_integrated(client):
    response = client.get("/api/v1/models/status")

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["meta"]["model_status"] == "unavailable"
    assert body["data"]["overall_status"] == "unavailable"
    assert len(body["data"]["models"]) == 5
    assert {model["status"] for model in body["data"]["models"]} == {"unavailable"}
    assert all("No verified model artifact" in model["reason"] for model in body["data"]["models"])
