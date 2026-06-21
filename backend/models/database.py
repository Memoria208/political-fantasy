"""
Database connection setup.
Set DATABASE_URL in your .env file:
  DATABASE_URL=postgresql://user:password@localhost:5432/political_fantasy
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/political_fantasy")

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,   # safe for async/background workers
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI dependency — yields a DB session and closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Call once on startup to create all tables if they don't exist."""
    from models.models import Base
    Base.metadata.create_all(bind=engine)
