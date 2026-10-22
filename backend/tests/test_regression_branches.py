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


def test_no_duplicate_branch_instances_for_same_college_and_latest_year_only():
    """
    REGRESSION CHECK:
    Ensure predictor never produces duplicate instances of the same branch
    (e.g., PICT Computer appearing multiple times at 93, 82, etc.).
    Only the single authoritative latest-year cutoff (or projected cutoff) is returned.
    """
    response = client.post("/api/predict", json={
        "percentile": 96.85,
        "category": "GOPENS",
        "preferred_cities": ["Pune", "Mumbai"],
        "preferred_branches": ["Computer Engineering", "Information Technology"],
        "cap_round": "III",
        "target_year": 2024
    })
    assert response.status_code == 200
    data = response.json()
    all_results = data["all_results"]

    # Verify every (college_id, branch_id) is unique
    seen_pairs = set()
    for item in all_results:
        pair = (item["college_id"], item["branch_id"])
        assert pair not in seen_pairs, f"Duplicate branch instance found for {item['college_name']} - {item['branch_name']}"
        seen_pairs.add(pair)
        # Verify year is strictly latest (2024)
        assert item["year"] == 2024, f"Cutoff year should be latest (2024), got {item['year']}"
        # Category must be GOPENS
        assert item["category"] == "GOPENS"
        # Projected cutoff must be present
        assert "projected_cutoff" in item
        assert item["projected_cutoff"] >= item["closing_percentile"]

    # PICT Computer Engineering must be exactly one instance with cutoff 99.55%
    pict_comp = [r for r in all_results if r["college_code"] == "6271" and r["branch_name"] == "Computer Engineering"]
    assert len(pict_comp) == 1
    assert pict_comp[0]["closing_percentile"] == 99.55
    # Must NOT be 93 or 82
    assert pict_comp[0]["closing_percentile"] not in [92.35, 93.05, 82.05, 82.75]

