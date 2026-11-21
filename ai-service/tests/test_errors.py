def test_unknown_endpoint_uses_consistent_error_envelope(client):
    response = client.get("/api/v1/not-a-route")

    assert response.status_code == 404
    body = response.json()
    assert body["ok"] is False
    assert body["data"] is None
    assert body["meta"]["model_status"] == "unavailable"
    assert body["error"] == {
        "code": "not_found",
        "message": "Resource not found.",
        "details": None,
    }


def test_unsupported_method_uses_consistent_error_envelope(client):
    response = client.post("/health")

    assert response.status_code == 405
    body = response.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "http_error"
    assert body["error"]["message"] == "Method Not Allowed"
