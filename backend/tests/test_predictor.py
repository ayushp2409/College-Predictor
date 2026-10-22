import pytest
from backend.app.engine.predictor import (
    determine_likelihood, resolve_candidate_categories, CandidateProfile
)

def test_determine_likelihood_likely():
    likelihood, prob, explanation = determine_likelihood(99.2, 97.5)
    assert likelihood == "Likely"
    assert prob >= 0.75
    assert "Safe" in explanation or "Strong chance" in explanation or "exceeds" in explanation

def test_determine_likelihood_borderline():
    likelihood, prob, explanation = determine_likelihood(97.8, 98.0)
    assert likelihood == "Borderline"
    assert 0.40 <= prob <= 0.75
    assert "within" in explanation or "Moderate chance" in explanation

def test_determine_likelihood_reach():
    likelihood, prob, explanation = determine_likelihood(92.0, 98.5)
    assert likelihood == "Reach"
    assert prob <= 0.45
    assert "below" in explanation or "Ambitious" in explanation

def test_resolve_candidate_categories_female():
    profile = CandidateProfile(percentile=95.0, category="LOPENS", gender="Female")
    cats = resolve_candidate_categories(profile)
    # Ladies should also be considered for General Open
    assert "LOPENS" in cats
    assert "GOPENS" in cats

def test_resolve_candidate_categories_tfws():
    profile = CandidateProfile(percentile=98.0, category="TFWS")
    cats = resolve_candidate_categories(profile)
    assert "TFWS" in cats
    assert "GOPENS" in cats

def test_resolve_candidate_categories_obc():
    profile = CandidateProfile(percentile=94.0, category="GOBCS")
    cats = resolve_candidate_categories(profile)
    assert "GOBCS" in cats
    assert "GOPENS" in cats

def test_single_instance_per_branch_and_latest_year(db_session):
    from backend.app.engine.predictor import PredictorEngine
    engine = PredictorEngine(db_session)
    profile = CandidateProfile(
        percentile=96.85,
        category="GOPENS",
        preferred_cities=["Pune"],
        cap_round="III",
        target_year=2024
    )
    res = engine.predict(profile)
    pict_comp_matches = [
        m for m in res["all_results"]
        if "Pune Institute of Computer Technology" in m["college_name"] and m["branch_name"] == "Computer Engineering"
    ]
    # Exactly one single instance
    assert len(pict_comp_matches) == 1
    item = pict_comp_matches[0]
    # Must be latest 2024 cutoff (99.55%), never SC (92.35%) or ST (82.05%)
    assert item["year"] == 2024
    assert item["category"] == "GOPENS"
    assert item["closing_percentile"] == 99.55
    # Must have projected 2025 cutoff
    assert "projected_cutoff" in item
    assert item["projected_cutoff"] >= item["closing_percentile"]
    assert item["projected_year"] == 2025

def test_alternative_recommendations_never_contain_reach_branch(db_session):
    from backend.app.engine.predictor import PredictorEngine
    engine = PredictorEngine(db_session)
    profile = CandidateProfile(
        percentile=96.85,
        category="GOPENS",
        preferred_cities=["Pune", "Mumbai"],
        preferred_branches=["Computer Engineering"],
        cap_round="III",
        target_year=2024
    )
    res = engine.predict(profile)
    alt_branches = res["alternatives"]["alternative_branches"]
    # Should not suggest Computer Engineering at PICT or VJTI as an alternative to Computer Engineering
    for alt in alt_branches:
        assert alt["branch_name"] != "Computer Engineering"
        assert alt["category"] == "GOPENS"
        assert alt["closing_percentile"] <= 96.85

