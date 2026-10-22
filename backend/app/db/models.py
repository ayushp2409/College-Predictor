import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.session import Base

class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    college_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    short_name = Column(String(50), nullable=True)
    city = Column(String(100), index=True, nullable=False)
    district = Column(String(100), nullable=True)
    university = Column(String(255), nullable=True)  # e.g., SPPU, Mumbai University
    institute_type = Column(String(100), nullable=False, default="Un-Aided")  # Govt, Govt Autonomous, Un-Aided Autonomous
    autonomy_status = Column(String(50), default="Autonomous")
    minority_status = Column(String(100), nullable=True)
    rating = Column(Float, default=4.0)
    nirf_ranking = Column(Integer, nullable=True)
    website = Column(String(255), nullable=True)
    established_year = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    branches = relationship("CollegeBranch", back_populates="college", cascade="all, delete-orphan")
    cutoffs = relationship("AdmissionCutoff", back_populates="college", cascade="all, delete-orphan")
    fees = relationship("CollegeFee", back_populates="college", cascade="all, delete-orphan")
    shortlists = relationship("SavedShortlist", back_populates="college")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    branch_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), index=True, nullable=False)
    short_code = Column(String(50), index=True, nullable=True)  # e.g. CS, IT, ENTC
    duration_years = Column(Integer, default=4)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    colleges = relationship("CollegeBranch", back_populates="branch", cascade="all, delete-orphan")
    cutoffs = relationship("AdmissionCutoff", back_populates="branch", cascade="all, delete-orphan")
    shortlists = relationship("SavedShortlist", back_populates="branch")


class CollegeBranch(Base):
    __tablename__ = "college_branches"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    course_code = Column(String(50), nullable=True)  # Combined code e.g. 600624510
    sanctioned_intake = Column(Integer, default=60)
    accreditation_status = Column(String(100), default="NBA Accredited")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    college = relationship("College", back_populates="branches")
    branch = relationship("Branch", back_populates="colleges")

    __table_args__ = (
        UniqueConstraint("college_id", "branch_id", name="uq_college_branch"),
    )


class AdmissionCutoff(Base):
    __tablename__ = "admission_cutoffs"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    year = Column(Integer, index=True, nullable=False)  # 2022, 2023, 2024, 2025
    academic_year = Column(String(20), nullable=False)  # "2024-25"
    cap_round = Column(String(10), index=True, nullable=False)  # "I", "II", "III"
    
    # Official MHT CET Category Information
    category = Column(String(50), index=True, nullable=False)  # e.g., GOPENS, LOPENH, TFWS, EWS, GOBCS
    base_category = Column(String(50), index=True, nullable=False)  # OPEN, OBC, SC, ST, EWS, TFWS, etc.
    seat_type = Column(String(50), nullable=True)  # REGULAR, TFWS, EWS, PWD, DEFENCE, ORPHAN
    location_type = Column(String(50), nullable=True)  # State Level, Home University, Other Than Home Univ
    special_quota = Column(String(50), nullable=True)
    stage = Column(String(20), default="I")  # Stage I, Stage II

    # Cutoffs
    opening_percentile = Column(Float, nullable=False)
    closing_percentile = Column(Float, nullable=False, index=True)
    median_percentile = Column(Float, nullable=True)
    opening_rank = Column(Integer, nullable=True)
    closing_rank = Column(Integer, nullable=True, index=True)
    median_rank = Column(Integer, nullable=True)
    percentile_spread = Column(Float, default=0.0)
    records_count = Column(Integer, default=1)
    data_quality_status = Column(String(50), default="VERIFIED_OFFICIAL")

    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    college = relationship("College", back_populates="cutoffs")
    branch = relationship("Branch", back_populates="cutoffs")

    __table_args__ = (
        Index("idx_cutoff_lookup", "year", "cap_round", "category", "closing_percentile"),
        Index("idx_cutoff_college_branch", "college_id", "branch_id", "year", "cap_round"),
    )


class CollegeFee(Base):
    __tablename__ = "college_fees"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    academic_year = Column(String(20), nullable=False, default="2024-25")
    tuition_fee = Column(Float, nullable=False, default=100000.0)
    development_fee = Column(Float, nullable=False, default=15000.0)
    other_fee = Column(Float, default=5000.0)
    total_annual_fee = Column(Float, nullable=False)
    hostel_fee_annual = Column(Float, default=45000.0)
    category_concessions = Column(JSON, default=dict)  # e.g., {"TFWS": 0, "EBC": 0.5, "SC": 0.0, "OBC": 0.5}
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    college = relationship("College", back_populates="fees")


class DataSource(Base):
    __tablename__ = "data_sources"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(255), nullable=False)  # e.g., "State CET Cell Maharashtra CAP Round Cutoffs"
    document_title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    source_year = Column(Integer, nullable=False)
    source_round = Column(String(20), nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    verified_by = Column(String(100), default="System Admin")
    verification_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    versions = relationship("DatasetVersion", back_populates="source")


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(Integer, primary_key=True, index=True)
    version_tag = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "v2024.1-final"
    description = Column(Text, nullable=True)
    source_id = Column(Integer, ForeignKey("data_sources.id", ondelete="SET NULL"), nullable=True)
    record_count = Column(Integer, default=0)
    status = Column(String(50), default="draft")  # draft, validated, published, archived
    validation_report = Column(JSON, default=dict)
    published_at = Column(DateTime, nullable=True)
    created_by = Column(String(100), default="admin")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    source = relationship("DataSource", back_populates="versions")
    training_jobs = relationship("TrainingJob", back_populates="dataset_version")


class PredictionModel(Base):
    __tablename__ = "prediction_models"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)  # e.g., "Heuristic Historical CAP Engine"
    version = Column(String(50), unique=True, index=True, nullable=False)  # "v1.0-heuristic", "v2.0-rf"
    algorithm = Column(String(100), nullable=False)  # "heuristic_cutoff", "random_forest_regressor", "gradient_boost"
    description = Column(Text, nullable=True)
    hyperparameters = Column(JSON, default=dict)
    metrics = Column(JSON, default=dict)  # {"accuracy": 0.89, "top3_recall": 0.94, "brier_score": 0.12}
    status = Column(String(50), default="candidate")  # candidate, active, archived, rolled_back
    artifact_path = Column(String(500), nullable=True)
    activated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    training_jobs = relationship("TrainingJob", back_populates="model")


class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("prediction_models.id", ondelete="SET NULL"), nullable=True)
    dataset_version_id = Column(Integer, ForeignKey("dataset_versions.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="queued")  # queued, running, completed, failed
    parameters = Column(JSON, default=dict)
    logs = Column(Text, default="")
    metrics = Column(JSON, default=dict)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    model = relationship("PredictionModel", back_populates="training_jobs")
    dataset_version = relationship("DatasetVersion", back_populates="training_jobs")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(String(50), default="student")  # admin, student
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    shortlists = relationship("SavedShortlist", back_populates="user")


class SavedShortlist(Base):
    __tablename__ = "saved_shortlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    student_session_id = Column(String(100), index=True, nullable=False)
    college_id = Column(Integer, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    likelihood = Column(String(50), nullable=True)  # Likely, Borderline, Reach
    candidate_percentile = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="shortlists")
    college = relationship("College", back_populates="shortlists")
    branch = relationship("Branch", back_populates="shortlists")

    __table_args__ = (
        UniqueConstraint("student_session_id", "college_id", "branch_id", name="uq_session_college_branch"),
    )


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_user_id = Column(Integer, nullable=True)
    admin_username = Column(String(50), nullable=False)
    action_type = Column(String(100), nullable=False)  # UPLOAD_DATASET, VALIDATE_DATASET, PUBLISH_DATASET, ACTIVATE_MODEL, ROLLBACK_MODEL, TRAIN_MODEL
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String(100), nullable=True)
    change_summary = Column(Text, nullable=False)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
