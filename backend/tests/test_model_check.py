"""
Unit Tests for Prediction Model Checking and Boundaries.
Verifies model performance metrics, likelihood predictions at boundary percentiles,
prediction consistency, and safety guards.
"""

import pytest
from sqlalchemy.orm import Session
from backend.app.engine.predictor import (
    determine_likelihood, resolve_candidate_categories, CandidateProfile, PredictorEngine
)
from backend.app.engine.ml_trainer import MLTrainerService
from backend.app.db.models import PredictionModel

def test_model_metrics_validity(db_session: Session):
    """Verify that active production model has valid statistical metrics."""
    trainer = MLTrainerService(db_session)
    active = trainer.get_active_model()
    assert active is not None
    metrics = active.metrics
    assert "mae" in metrics
    assert "r2_score" in metrics
    assert metrics["mae"] >= 0.0
    assert metrics["r2_score"] > 0.8, "Production model R² must be >= 0.8"


def test_model_prediction_boundary_high_percentile(db_session: Session):
    """
    Candidates with 99.85 percentile should have premier colleges
    classified as Likely or Borderline with probability >= 0.70.
    """
    engine = PredictorEngine(db_session)
    profile = CandidateProfile(
        percentile=99.85,
        category="GOPENS"
    )
    res = engine.predict(profile)
    assert res["summary"]["total_matches"] > 0
    assert res["summary"]["likely_count"] > 0

    # Verify at least one top college is classified as Likely
    likely_colleges = [r["college_code"] for r in res["results"]["likely"]]
    assert any(code in likely_colleges for code in ["6006", "3012", "6271", "3215"])


def test_model_prediction_boundary_low_percentile(db_session: Session):
    """
    Candidates with 65.0 percentile should have premier colleges (COEP, VJTI, PICT)
    classified as Reach with low probability.
    """
    engine = PredictorEngine(db_session)
    profile = CandidateProfile(
        percentile=65.0,
        category="GOPENS"
    )
    res = engine.predict(profile)
    reach_colleges = [r["college_code"] for r in res["results"]["reach"]]
    assert "6006" in reach_colleges or "3012" in reach_colleges or "6271" in reach_colleges


def test_model_likelihood_score_monotonicity():
    """Higher percentile margin strictly yields higher probability."""
    l1, p1, _ = determine_likelihood(99.0, 95.0)  # +4.0 margin
    l2, p2, _ = determine_likelihood(96.0, 95.0)  # +1.0 margin
    l3, p3, _ = determine_likelihood(93.0, 95.0)  # -2.0 margin

    assert p1 > p2 > p3
    assert l1 == "Likely"
    assert l2 == "Borderline"
    assert l3 == "Reach"
