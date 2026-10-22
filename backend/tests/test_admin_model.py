import uuid
import pytest
from backend.app.db.session import SessionLocal
from backend.app.db.models import PredictionModel, User
from backend.app.engine.ml_trainer import MLTrainerService

def test_ml_trainer_active_model():
    db = SessionLocal()
    try:
        trainer = MLTrainerService(db)
        active = trainer.get_active_model()
        assert active is not None
        assert active.status == "active"
    finally:
        db.close()

def test_unvalidated_model_activation_fails():
    db = SessionLocal()
    try:
        # Create unvalidated model with bad metrics and unique version
        uid = uuid.uuid4().hex[:8]
        bad_model = PredictionModel(
            model_name="Bad Test Model",
            version=f"v_bad_test_{uid}",
            algorithm="random_forest_regressor",
            metrics={"mae": 15.5, "validation_passed": False},
            status="candidate"
        )
        db.add(bad_model)
        db.commit()
        db.refresh(bad_model)

        trainer = MLTrainerService(db)
        success, msg = trainer.activate_model(bad_model.id, admin_username="admin")
        assert success is False
        assert "failed safety validation" in msg

        # Ensure bad model is still candidate, NOT active
        reloaded = db.query(PredictionModel).filter(PredictionModel.id == bad_model.id).first()
        assert reloaded.status == "candidate"
    finally:
        db.close()

def test_validated_model_activation_and_rollback():
    db = SessionLocal()
    try:
        trainer = MLTrainerService(db)
        initial_active = trainer.get_active_model()
        assert initial_active is not None

        # Create valid candidate model with unique version
        uid = uuid.uuid4().hex[:8]
        good_model = PredictionModel(
            model_name="Good Validated Model",
            version=f"v_good_test_{uid}",
            algorithm="gradient_boost",
            metrics={"mae": 0.85, "r2_score": 0.95, "validation_passed": True},
            status="candidate"
        )
        db.add(good_model)
        db.commit()
        db.refresh(good_model)

        # Activate good model
        success, msg = trainer.activate_model(good_model.id, admin_username="admin")
        assert success is True
        assert trainer.get_active_model().id == good_model.id

        # Previous active should now be archived
        prev_reloaded = db.query(PredictionModel).filter(PredictionModel.id == initial_active.id).first()
        assert prev_reloaded.status == "archived"

        # Rollback
        rb_success, rb_msg = trainer.rollback_model(admin_username="admin")
        assert rb_success is True
        assert "rolled back" in rb_msg.lower()

        # Currently active model should now be the initial one again
        rolled_back_active = trainer.get_active_model()
        assert rolled_back_active.id == initial_active.id
    finally:
        db.close()

def test_training_job_execution():
    db = SessionLocal()
    try:
        trainer = MLTrainerService(db)
        job = trainer.start_training_job(
            algorithm="random_forest_regressor",
            hyperparameters={"n_estimators": 10, "max_depth": 4, "random_state": 42},
            admin_username="admin"
        )
        assert job.status == "completed"
        assert job.model_id is not None
        assert "mae" in job.metrics
        assert "r2_score" in job.metrics

        # Newly trained model must remain a candidate (NEVER automatically active)
        cand_model = db.query(PredictionModel).filter(PredictionModel.id == job.model_id).first()
        assert cand_model.status == "candidate"
    finally:
        db.close()
