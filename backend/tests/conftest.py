import pytest
from backend.app.db.session import engine, Base, SessionLocal
from backend.seed_data import seed_database
from backend.app.db.models import User, PredictionModel
from backend.app.api.deps import get_password_hash
from backend.app.config import settings

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Create admin user
        admin = db.query(User).filter(User.username == settings.ADMIN_USERNAME).first()
        if not admin:
            admin = User(
                username=settings.ADMIN_USERNAME,
                email=settings.ADMIN_EMAIL,
                hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                full_name="State CET Admissions Administrator",
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()

        # Ensure active baseline prediction model exists
        active_model = db.query(PredictionModel).filter(PredictionModel.status == "active").first()
        if not active_model:
            baseline_model = PredictionModel(
                model_name="MHT CET Verified Multi-Year Cutoff Predictor",
                version="v1.0-cutoff-verified",
                algorithm="heuristic_cutoff_engine",
                description="Production baseline cutoff predictor operating on official CAP admission data.",
                hyperparameters={"confidence_level": 0.95, "smoothing_window": 3},
                metrics={
                    "accuracy": 0.942,
                    "top3_recall": 0.968,
                    "mae": 1.18,
                    "r2_score": 0.924,
                    "validation_passed": True
                },
                status="active"
            )
            db.add(baseline_model)
            db.commit()

        # Seed initial data
        seed_database(db)
    finally:
        db.close()

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
