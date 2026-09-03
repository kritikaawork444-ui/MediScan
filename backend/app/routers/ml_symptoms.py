"""
Two-stage symptom checker:
  1. Trained RandomForest (dataset1.csv) predicts disease from symptom scores.
  2. Ollama explains treatment when available; otherwise offline knowledge-base plan.
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import MLPredictRequest, MLPredictResponse
from app.services import ml_predictor, ollama_service, offline_fallback

router = APIRouter(prefix="/api/symptoms", tags=["ML Symptom Predictor"])


@router.post("/predict-ml", response_model=MLPredictResponse)
def predict_ml(payload: MLPredictRequest, db: Session = Depends(get_db)):
    if not ml_predictor.is_ready():
        raise HTTPException(
            503,
            "The trained model isn't available. Run `python -m app.ml.train_model "
            "dataset1.csv` from the backend/ folder first.",
        )

    prediction = ml_predictor.predict(
        payload.fever, payload.headache, payload.cough, payload.fatigue, payload.body_pain
    )

    symptom_scores = {
        "Fever": payload.fever,
        "Headache": payload.headache,
        "Cough": payload.cough,
        "Fatigue": payload.fatigue,
        "Body_Pain": payload.body_pain,
    }

    try:
        plan = ollama_service.generate_treatment_plan(
            prediction["disease"],
            symptom_scores,
            prediction["confidence"],
            payload.language or "en",
        )
        title = "Symptom Predictor (ML + Local AI)"
    except Exception:
        plan = offline_fallback.generate_treatment_plan_offline(
            prediction["disease"],
            symptom_scores,
            prediction["confidence"],
            payload.language or "en",
        )
        title = "Symptom Predictor (ML + Offline guide)"

    result = {**prediction, **plan}

    record = Analysis(
        analysis_type="symptom",
        title=title,
        input_summary=", ".join(f"{k}: {v}" for k, v in symptom_scores.items()),
        result_label=result["disease"],
        confidence=result["confidence"],
        severity=None,
        details_json=json.dumps(result),
    )
    db.add(record)
    db.commit()

    return result
