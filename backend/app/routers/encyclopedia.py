import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import DiseaseCache
from app.schemas import DiseaseLookupRequest, DiseaseLookupResponse
from app.services import ollama_service, offline_fallback

router = APIRouter(prefix="/api/encyclopedia", tags=["Encyclopedia"])

# Static reference data for common conditions. In a bigger version this
# would live in its own DB table, but a fixed list is fine for the
# conditions the app currently supports.
CONDITIONS = [
    {
        "name": "Common Cold",
        "category": "Viral",
        "risk": "Low",
        "description": "A mild viral infection of the upper respiratory tract.",
        "symptoms": "Runny nose, sneezing, sore throat, cough",
    },
    {
        "name": "Influenza (Flu)",
        "category": "Viral",
        "risk": "Moderate",
        "description": "A viral infection causing fever, chills, body ache and fatigue.",
        "symptoms": "Fever, chills, cough, headache, sore throat",
    },
    {
        "name": "Migraine",
        "category": "Common",
        "risk": "Moderate",
        "description": "A neurological condition causing severe headaches.",
        "symptoms": "Severe headache, nausea, light sensitivity",
    },
]


@router.get("/")
def list_conditions(q: Optional[str] = Query(None), category: Optional[str] = Query(None)):
    results = CONDITIONS
    if category and category.lower() != "all":
        results = [c for c in results if c["category"].lower() == category.lower()]
    if q:
        q_lower = q.lower()
        results = [
            c
            for c in results
            if q_lower in c["name"].lower() or q_lower in c["symptoms"].lower()
        ]
    return results


@router.post("/lookup", response_model=DiseaseLookupResponse)
def lookup_disease(payload: DiseaseLookupRequest, db: Session = Depends(get_db)):
    """Encyclopedia 'Ask AI': cache → Ollama → offline knowledge base."""
    query = payload.query.strip()
    language = payload.language or "en"
    if not query:
        raise HTTPException(status_code=400, detail="Missing 'query'")

    if language == "en":
        cached = db.query(DiseaseCache).filter(DiseaseCache.name.ilike(query)).first()
        if cached:
            return {
                "name": cached.name,
                "category": cached.category or "Common",
                "risk_level": cached.risk_level or "Moderate",
                "description": cached.description or "",
                "symptoms": cached.symptoms or "",
                "causes": cached.causes or "",
                "treatment": json.loads(cached.treatment_json or "[]"),
                "disclaimer": cached.disclaimer or "",
                "source": "cache",
            }

    source = "ai"
    try:
        result = ollama_service.lookup_disease(query, language)
    except Exception:
        result = offline_fallback.lookup_disease_offline(query, language)
        source = "offline"

    if language == "en" and source == "ai":
        existing = db.query(DiseaseCache).filter(DiseaseCache.name.ilike(result["name"])).first()
        if not existing:
            db.add(
                DiseaseCache(
                    name=result["name"],
                    category=result.get("category"),
                    risk_level=result.get("risk_level"),
                    description=result.get("description"),
                    symptoms=result.get("symptoms"),
                    causes=result.get("causes"),
                    treatment_json=json.dumps(result.get("treatment", [])),
                    disclaimer=result.get("disclaimer"),
                )
            )
            db.commit()

    return {**result, "source": source}
