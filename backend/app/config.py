import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "MHT CET College Predictor API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "mhtcet_predictor_secret_jwt_key_2026_super_secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Admin Credentials
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin@MHTCET2026")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@mhtcetpredictor.gov.in")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://postgres:postgres@localhost:5432/mhtcet_db"
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./mhtcet_local.db"
    
    # Uploads & Model Artifacts
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "data_uploads")
    MODEL_DIR: str = os.getenv("MODEL_DIR", "model_artifacts")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
