"""
Entry point. Run with:  uvicorn app.main:app --reload
This creates the DB tables on startup (if they don't exist) and mounts
every feature router under /api/*.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.routers import (
    symptoms,
    reports,
    injury,
    history,
    encyclopedia,
    ml_symptoms,
    gender_ml,
    consult,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MediScan API",
    description="Backend powering the MediScan AI Health Assistant app",
    version="1.0.0",
)


@app.on_event("startup")
def _preload_ml_models() -> None:
    """Warm injury/gender/report models so first user request is not a multi-second cold start."""
    try:
        from app.services import injury_ml_predictor

        if injury_ml_predictor.is_ready():
            injury_ml_predictor._load()
    except Exception:
        pass
    try:
        from app.services import gender_predictor

        if gender_predictor.is_ready():
            gender_predictor._load_kb()
            try:
                gender_predictor._load_sym()
            except Exception:
                pass
            try:
                gender_predictor._load_inj()
            except Exception:
                pass
    except Exception:
        pass
    try:
        from app.services import ml_predictor

        if hasattr(ml_predictor, "is_ready") and ml_predictor.is_ready():
            # touch predict path / internal load if available
            if hasattr(ml_predictor, "_load"):
                ml_predictor._load()
            elif hasattr(ml_predictor, "load_model"):
                ml_predictor.load_model()
    except Exception:
        pass
    try:
        from app.services import report_ml_predictor

        if report_ml_predictor.is_ready() and hasattr(report_ml_predictor, "_load"):
            report_ml_predictor._load()
    except Exception:
        pass

app.add_middleware(
    CORSMiddleware,
    # Preview environments use dynamic hosts; allow all origins in dev.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(symptoms.router)
app.include_router(ml_symptoms.router)
app.include_router(gender_ml.router)
app.include_router(reports.router)
app.include_router(injury.router)
app.include_router(history.router)
app.include_router(encyclopedia.router)
app.include_router(consult.router)


@app.get("/")
def root():
    return {"status": "MediScan API is running", "docs": "/docs"}
