import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# Attempt to connect to PostgreSQL, fallback gracefully to SQLite if unavailable
engine = None
try:
    test_engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args={"connect_timeout": 3} if "postgresql" in settings.DATABASE_URL else {}
    )
    with test_engine.connect() as conn:
        logger.info("Successfully connected to primary database (PostgreSQL).")
    engine = test_engine
except Exception as e:
    logger.warning(
        f"Primary database connection ({settings.DATABASE_URL}) failed: {e}. "
        f"Falling back to local SQLite ({settings.SQLITE_FALLBACK_URL})."
    )
    engine = create_engine(
        settings.SQLITE_FALLBACK_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
