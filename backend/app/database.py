"""
Database setup. Uses SQLite by default (a single file, mediscan.db) so the
whole backend runs with zero external services. Swapping DATABASE_URL in
.env to a Postgres URL later works without changing any other code, since
SQLAlchemy abstracts the actual database engine.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

connect_args = {"check_same_thread": False} if "sqlite" in settings.database_url else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: gives each request its own DB session and
    always closes it afterwards, even if the request raises an error."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
