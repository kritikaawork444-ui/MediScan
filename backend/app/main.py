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
