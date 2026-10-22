"""
Regression Tests for College Branch Offerings from Verified CAP Dataset.
Ensures no invalid branches are associated with colleges (e.g. No Civil in PICT, SPIT, VIT, etc.)
and validates courses are displayed in descending order of cutoff percentile.
"""

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient
from backend.app.db.models import College, Branch, CollegeBranch, AdmissionCutoff
from backend.app.main import app

client = TestClient(app)

def test_pict_has_no_civil_engineering(db_session: Session):
    """
    REGRESSION CHECK:
    Verify that Pune Institute of Computer Technology (PICT, code 6271)
    does NOT offer Civil Engineering, Mechanical Engineering, or Electrical Engineering.
    PICT only offers computing and electronics: COMP, IT, AI&DS, ENTC.
    """
    pict = db_session.query(College).filter(
        (College.college_code == "6271") | (College.name.ilike("%Pune Institute of Computer Technology%"))
    ).first()
    assert pict is not None, "PICT college record must exist in the database."

    # Get all branches linked to PICT
    branches = (
        db_session.query(Branch.name, Branch.short_code)
        .join(CollegeBranch, CollegeBranch.branch_id == Branch.id)
        .filter(CollegeBranch.college_id == pict.id)
        .all()
    )
    branch_names = [b[0] for b in branches]

    # Explicit assertions for nonexistent branches
    assert "Civil Engineering" not in branch_names, "PICT must NOT offer Civil Engineering!"
    assert "Mechanical Engineering" not in branch_names, "PICT must NOT offer Mechanical Engineering!"
    assert "Electrical Engineering" not in branch_names, "PICT must NOT offer Electrical Engineering!"

    # Explicit assertions for actual offered branches
    assert "Computer Engineering" in branch_names, "PICT must offer Computer Engineering!"
    assert "Information Technology" in branch_names, "PICT must offer Information Technology!"
    assert "Electronics and Telecommunication Engg" in branch_names, "PICT must offer ENTC!"


def test_spit_and_vit_have_no_civil_engineering(db_session: Session):
    """
    REGRESSION CHECK:
    Verify SPIT (Mumbai) and VIT (Pune) do NOT offer Civil Engineering.
    """
    spit = db_session.query(College).filter(College.college_code == "3215").first()
    assert spit is not None
    spit_branches = [
        b[0] for b in db_session.query(Branch.name)
        .join(CollegeBranch, CollegeBranch.branch_id == Branch.id)
        .filter(CollegeBranch.college_id == spit.id)
        .all()
    ]
    assert "Civil Engineering" not in spit_branches, "SPIT must NOT offer Civil Engineering!"

    vit = db_session.query(College).filter(College.college_code == "6273").first()
    assert vit is not None
    vit_branches = [
        b[0] for b in db_session.query(Branch.name)
        .join(CollegeBranch, CollegeBranch.branch_id == Branch.id)
        .filter(CollegeBranch.college_id == vit.id)
        .all()
    ]
    assert "Civil Engineering" not in vit_branches, "VIT Pune must NOT offer Civil Engineering!"


def test_colleges_with_civil_engineering(db_session: Session):
    """
    Verify that institutes that DO legitimately offer Civil Engineering
    (COEP, VJTI, Walchand, PCCOE) have Civil Engineering properly linked.
    """
    for code in ["6006", "3012", "6007", "6175"]:
        col = db_session.query(College).filter(College.college_code == code).first()
        assert col is not None
        branches = [
            b[0] for b in db_session.query(Branch.name)
            .join(CollegeBranch, CollegeBranch.branch_id == Branch.id)
            .filter(CollegeBranch.college_id == col.id)
            .all()
        ]
        assert "Civil Engineering" in branches, f"College {col.short_name} ({code}) must offer Civil Engineering!"


def test_prediction_api_never_returns_civil_for_pict():
    """
    REGRESSION CHECK VIA API:
    When a candidate inputs high percentiles (e.g. 99.0%), PICT should appear for
    Computer Engineering, IT, ENTC, but NEVER for Civil Engineering.
    """
    response = client.post("/api/predict", json={
        "percentile": 99.2,
        "category": "GOPENS",
        "preferred_cities": ["Pune"]
    })
    assert response.status_code == 200
    data = response.json()
    all_results = data["all_results"]

    pict_results = [r for r in all_results if r["college_code"] == "6271"]
    assert len(pict_results) > 0, "PICT should be matched for 99.2 percentile."

    for r in pict_results:
        assert r["branch_name"] != "Civil Engineering", "PICT must NEVER be returned with Civil Engineering!"


def test_college_details_courses_displayed_in_descending_order(db_session: Session):
    """
    REQUIREMENT CHECK:
    Courses returned by /api/colleges/{id} must be sorted in descending order
    of historical closing cutoff percentile.
    """
    pict = db_session.query(College).filter(College.college_code == "6271").first()
    assert pict is not None

    response = client.get(f"/api/colleges/{pict.id}")
    assert response.status_code == 200
    data = response.json()
    branches = data["branches"]

    assert len(branches) >= 2, "PICT should have at least 2 branches."
    # Verify cutoffs are strictly descending
    cutoffs = [b["closing_percentile"] for b in branches]
    for i in range(len(cutoffs) - 1):
        assert cutoffs[i] >= cutoffs[i + 1], (
            f"Branches must be in descending order: {cutoffs[i]} should be >= {cutoffs[i+1]}"
        )
