"""
Unit Tests for Authentication and Login Checks.
Tests valid logins, wrong passwords, non-existent users, token issuance,
token validation, and route protection.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.config import settings

client = TestClient(app)

def test_login_success_with_valid_credentials():
    """Valid credentials return a 200 OK with a valid JWT bearer token."""
    response = client.post("/api/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": settings.ADMIN_PASSWORD
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == settings.ADMIN_USERNAME


def test_login_fails_with_invalid_password():
    """Invalid password returns 401 Unauthorized with descriptive error."""
    response = client.post("/api/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": "WrongPassword@999"
    })
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
    assert "incorrect" in data["detail"].lower()


def test_login_fails_with_nonexistent_user():
    """Non-existent username returns 401 Unauthorized."""
    response = client.post("/api/auth/login", json={
        "username": "unknown_random_admin_user",
        "password": "Password123"
    })
    assert response.status_code == 401
    data = response.json()
    assert "incorrect" in data["detail"].lower()


def test_login_fails_with_empty_fields():
    """Empty credentials should fail gracefully."""
    response = client.post("/api/auth/login", json={
        "username": "",
        "password": ""
    })
    assert response.status_code in [400, 401, 422]


def test_protected_route_rejects_missing_token():
    """Accessing protected endpoints without an Authorization header returns 401."""
    response = client.get("/api/admin/models")
    assert response.status_code == 401


def test_protected_route_rejects_malformed_token():
    """Accessing protected endpoints with a malformed Bearer token returns 401."""
    response = client.get(
        "/api/admin/models",
        headers={"Authorization": "Bearer totally_malformed_and_invalid_token"}
    )
    assert response.status_code == 401


def test_protected_route_succeeds_with_valid_token():
    """Accessing protected endpoints with a valid token returns 200 OK."""
    login_resp = client.post("/api/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": settings.ADMIN_PASSWORD
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    response = client.get(
        "/api/admin/models",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    models_list = response.json()
    assert isinstance(models_list, list)
    assert len(models_list) > 0
