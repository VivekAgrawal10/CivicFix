import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture()
def client():
    settings = Settings(environment="test", log_level="WARNING")
    with TestClient(create_app(settings)) as test_client:
        yield test_client
