"""
Unit Tests for CAP Round Choice List (Option Form) Generation and Exports.
Validates 9-digit choice codes, strategy sequencing, PDF generation, and CSV export.
"""

import io
import csv
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_cap_choice_code_presence_in_prediction():
    """Verify that predictions return valid 9-digit Maharashtra DTE choice codes."""
    response = client.post("/api/predict", json={
        "percentile": 98.5,
        "category": "GOPENS"
    })
    assert response.status_code == 200
    data = response.json()
    all_results = data["all_results"]

    for r in all_results[:10]:
        assert "choice_code" in r, "Each prediction result must contain a choice_code"
        choice_code = r["choice_code"]
        assert len(choice_code) >= 9, f"Choice code {choice_code} must be at least 9 characters"
        # Institute code should match first 4 digits
        assert choice_code.startswith(r["college_code"])


def test_cap_option_form_csv_export():
    """Verify official CAP Choice Code list CSV export produces valid headers and content."""
    payload = {
        "student_name": "Rohan Deshmukh",
        "application_id": "EN24108593",
        "percentile": 98.75,
        "category": "GOPENS",
        "merit_rank": 2150,
        "choices": [
            {
                "preference_no": 1,
                "choice_code": "600624510",
                "college_code": "6006",
                "college_name": "College of Engineering, Pune",
                "city": "Pune",
                "branch_code": "24510",
                "branch_name": "Computer Engineering",
                "seat_type": "GOPENS",
                "likelihood": "Likely",
                "closing_percentile": 99.82,
                "closing_rank": 350
            },
            {
                "preference_no": 2,
                "choice_code": "627124510",
                "college_code": "6271",
                "college_name": "Pune Institute of Computer Technology",
                "city": "Pune",
                "branch_code": "24510",
                "branch_name": "Computer Engineering",
                "seat_type": "GOPENS",
                "likelihood": "Likely",
                "closing_percentile": 99.55,
                "closing_rank": 820
            }
        ]
    }

    response = client.post("/api/shortlist/cap-option-form/export/csv", json=payload)
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]

    # Parse CSV content
    reader = csv.reader(io.StringIO(response.text))
    rows = list(reader)
    assert len(rows) > 5

    # Check Choice Code row exists
    content_str = response.text
    assert "600624510" in content_str
    assert "627124510" in content_str
    assert "Rohan Deshmukh" in content_str
    assert "EN24108593" in content_str


def test_cap_option_form_pdf_export():
    """Verify official CAP Choice Code Option Form PDF export returns binary PDF document."""
    payload = {
        "student_name": "Ananya Patil",
        "application_id": "EN24109921",
        "percentile": 97.40,
        "category": "GOPENS",
        "merit_rank": 4320,
        "choices": [
            {
                "preference_no": 1,
                "choice_code": "627124610",
                "college_code": "6271",
                "college_name": "Pune Institute of Computer Technology",
                "city": "Pune",
                "branch_code": "24610",
                "branch_name": "Information Technology",
                "seat_type": "GOPENS",
                "likelihood": "Borderline",
                "closing_percentile": 99.35,
                "closing_rank": 1150
            }
        ]
    }

    response = client.post("/api/shortlist/cap-option-form/export/pdf", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment" in response.headers["content-disposition"]
    # PDF files start with %PDF magic bytes
    assert response.content[:4] == b"%PDF"
