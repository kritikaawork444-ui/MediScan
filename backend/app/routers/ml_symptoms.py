"""
ML Symptom Predictor:
  1. Trained RandomForest predicts disease from symptom scores.
  2. Offline knowledge base builds treatment (profile gender notes when set).
  No Ollama / cloud LLM.
"""
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import MLPredictRequest, MLPredictResponse
from app.services import ml_predictor, offline_fallback, gender_predictor

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
    lang = payload.language or "en"
    gender = payload.gender

    plan = offline_fallback.generate_treatment_plan_offline(
        prediction["disease"],
        symptom_scores,
        prediction["confidence"],
        lang,
        gender=gender,
    )

    result = {**prediction, **plan}
    result = gender_predictor.enrich_with_profile_gender(
        result, gender, condition_key="disease"
    )

    summary = ", ".join(f"{k}: {v}" for k, v in symptom_scores.items())
    if gender:
        summary += f" | Gender: {gender}"

    record = Analysis(
        analysis_type="symptom",
        title="Symptom Predictor (ML + Offline guide)",
        input_summary=summary,
        result_label=result["disease"],
        confidence=result["confidence"],
        severity=None,
        details_json=json.dumps({**result, "source": "ml_offline"}),
    )
    db.add(record)
    db.commit()

    return result
