import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_root_and_health():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

def test_get_categories():
    response = client.get("/api/predict/categories")
    assert response.status_code == 200
    cats = response.json()
    assert len(cats) > 0
    codes = [c["code"] for c in cats]
    assert "GOPENS" in codes
    assert "TFWS" in codes
    assert "EWS" in codes

def test_predict_endpoint():
    payload = {
        "percentile": 98.5,
        "merit_rank": 3200,
        "category": "GOPENS",
        "gender": "All",
        "preferred_cities": ["Pune", "Mumbai"],
        "cap_round": "III",
        "target_year": 2024
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "results" in data
    assert "likely" in data["results"]
    assert "borderline" in data["results"]
    assert "reach" in data["results"]

def test_list_colleges():
    response = client.get("/api/colleges?page=1&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert len(data["items"]) <= 5

def test_compare_endpoint():
    # Fetch two colleges
    colleges_resp = client.get("/api/colleges?limit=2")
    cols = colleges_resp.json()["items"]
    if len(cols) >= 2:
        branches_resp = client.get("/api/colleges/branches/list")
        br_id = branches_resp.json()[0]["id"]
        
        payload = {
            "items": [
                {"college_id": cols[0]["id"], "branch_id": br_id},
                {"college_id": cols[1]["id"], "branch_id": br_id}
            ],
            "category": "GOPENS",
            "candidate_percentile": 96.0
        }
        res = client.post("/api/compare", json=payload)
        assert res.status_code == 200
        assert res.json()["count"] == 2

def test_shortlist_crud():
    colleges_resp = client.get("/api/colleges?limit=1")
    col_id = colleges_resp.json()["items"][0]["id"]
    branches_resp = client.get("/api/colleges/branches/list")
    br_id = branches_resp.json()[0]["id"]

    session_id = "test_student_session_123"
    add_payload = {
        "student_session_id": session_id,
        "college_id": col_id,
        "branch_id": br_id,
        "likelihood": "Likely",
        "notes": "Top preference"
    }

    # Add
    res = client.post("/api/shortlist", json=add_payload)
    assert res.status_code == 200
    shortlist_id = res.json()["id"]

    # Get
    get_res = client.get(f"/api/shortlist?session_id={session_id}")
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1

    # Delete
    del_res = client.delete(f"/api/shortlist/{shortlist_id}")
    assert del_res.status_code == 200

def test_admin_route_protection():
    # Calling admin endpoint without auth header must return 401
    res = client.get("/api/admin/stats")
    assert res.status_code in [401, 403]
