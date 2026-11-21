def test_health_returns_service_envelope_and_correlation_headers(client):
    response = client.get("/health", headers={"X-Request-ID": "test-request-1"})

    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"] == {
        "service": "civicfix-ai-service",
        "environment": "test",
        "status": "healthy",
    }
    assert body["meta"]["request_id"] == "test-request-1"
    assert body["meta"]["model_status"] == "unavailable"
    assert body["meta"]["processing_ms"] >= 0
    assert body["error"] is None
    assert response.headers["x-request-id"] == "test-request-1"
    assert float(response.headers["x-process-time-ms"]) >= 0
