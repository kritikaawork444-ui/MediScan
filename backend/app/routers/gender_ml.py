"""
Gender-aware ML endpoints backed by the spreadsheet knowledge base
(Symptoms / Injuries with Male- & Female-Specific Notes).
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import (
    GenderSymptomPredictRequest,
    GenderSymptomPredictResponse,
    GenderInjuryPredictRequest,
    GenderInjuryPredictResponse,
    GenderConditionProb,
)
from app.services import gender_predictor

router = APIRouter(prefix="/api/gender-ml", tags=["Gender-aware ML"])


@router.get("/status")
def status():
    return {
        "symptoms_ready": gender_predictor.is_ready(),
        "injuries_ready": gender_predictor.injury_ready(),
    }


@router.get("/symptoms")
def symptoms_catalog():
    if not gender_predictor.is_ready():
        raise HTTPException(503, "Gender symptom model not trained yet.")
    items = gender_predictor.list_symptoms()
    # group by category for the UI
    by_cat: dict[str, list] = {}
    for s in items:
        by_cat.setdefault(s["category"] or "Other", []).append(s)
    return {"count": len(items), "items": items, "by_category": by_cat}


@router.get("/injuries")
def injuries_catalog():
    if not gender_predictor.injury_ready():
        raise HTTPException(503, "Gender injury model not trained yet.")
    items = gender_predictor.list_injuries()
    body_parts = sorted({i["body_part"] for i in items if i.get("body_part")})
    by_cat: dict[str, list] = {}
    for s in items:
        by_cat.setdefault(s["category"] or "Other", []).append(s)
    return {
        "count": len(items),
        "items": items,
        "body_parts": body_parts,
        "by_category": by_cat,
    }


@router.post("/predict-symptoms", response_model=GenderSymptomPredictResponse)
def predict_symptoms(payload: GenderSymptomPredictRequest, db: Session = Depends(get_db)):
    if not gender_predictor.is_ready():
        raise HTTPException(
            503,
            "Gender model missing. Run: python -m app.ml.train_gender_model",
        )
    if not payload.symptoms:
        raise HTTPException(400, "Select at least one symptom.")
    try:
        result = gender_predictor.predict_symptoms(
            payload.symptoms,
            gender=payload.gender,
            intensity=payload.intensity if payload.intensity is not None else 0.7,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    record = Analysis(
        analysis_type="symptom",
        title=f"Gender ML Symptom Check ({result['gender']})",
        input_summary=", ".join(result.get("matched_symptoms") or payload.symptoms),
        result_label=result["condition"],
        confidence=result["confidence"],
        severity=result.get("severity"),
        details_json=json.dumps(result),
    )
    db.add(record)
    db.commit()
    return result


@router.post("/predict-injury", response_model=GenderInjuryPredictResponse)
def predict_injury(payload: GenderInjuryPredictRequest, db: Session = Depends(get_db)):
    if not gender_predictor.injury_ready():
        raise HTTPException(
            503,
            "Gender injury model missing. Run: python -m app.ml.train_gender_model",
        )
    if not payload.injury_hint and not payload.body_part:
        raise HTTPException(400, "Provide injury_hint and/or body_part.")
    try:
        result = gender_predictor.predict_injury(
            injury_hint=payload.injury_hint,
            body_part=payload.body_part,
            gender=payload.gender,
            intensity=payload.intensity if payload.intensity is not None else 0.7,
        )
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc

    record = Analysis(
        analysis_type="injury",
        title=f"Gender ML Injury Check ({result['gender']})",
        input_summary=payload.injury_hint or payload.body_part or "",
        result_label=result["condition"],
        confidence=result["confidence"],
        severity=result.get("severity"),
        details_json=json.dumps(result),
    )
    db.add(record)
    db.commit()
    return result
