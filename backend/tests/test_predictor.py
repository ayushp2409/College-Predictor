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
