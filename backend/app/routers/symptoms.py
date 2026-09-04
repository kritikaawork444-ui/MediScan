import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import SymptomCheckRequest, OllamaSymptomCheckResponse
from app.services import offline_fallback, gender_predictor
from app.services.result_i18n import localize_symptom_result

router = APIRouter(prefix="/api/symptoms", tags=["Symptom Checker"])


@router.post("/check-ollama", response_model=OllamaSymptomCheckResponse)
@router.post("/check", response_model=OllamaSymptomCheckResponse)
def check_symptoms(payload: SymptomCheckRequest, db: Session = Depends(get_db)):
    """
    Symptom checker — offline knowledge base only (no Ollama / cloud LLM).
    Uses profile gender for male/female-specific treatment notes when provided.
    """
    if not payload.symptoms:
        raise HTTPException(400, "Select at least one symptom.")

    lang = payload.language or "en"
    gender = payload.gender

    result = offline_fallback.analyze_symptoms_offline(
        payload.symptoms,
        payload.notes,
        payload.pain_location,
        payload.pain_description,
        lang,
        gender=gender,
    )

    result.setdefault("possible_causes", [])
    result.setdefault("recommendations", [])
    result.setdefault("treatment", [])
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Please consult a doctor for proper care.",
    )
    result = localize_symptom_result(result, lang)
    if not result.get("condition") and result["possible_causes"]:
        result["condition"] = result["possible_causes"][0].get("condition", "Unknown")
        result["confidence"] = result["possible_causes"][0].get("confidence", 50)

    result = gender_predictor.enrich_with_profile_gender(
        result, gender, symptoms=payload.symptoms, condition_key="condition"
    )

    summary_parts = [", ".join(payload.symptoms)]
    if payload.pain_location:
        summary_parts.append(f"Location: {payload.pain_location}")
    if payload.pain_description:
        summary_parts.append(f"Feels: {payload.pain_description}")
    if gender:
        summary_parts.append(f"Gender: {gender}")

    record = Analysis(
        analysis_type="symptom",
        title="Symptom Check (Offline guide)",
        input_summary=" | ".join(summary_parts),
        result_label=result["condition"],
        confidence=result.get("confidence"),
        severity=None,
        details_json=json.dumps({**result, "source": "offline"}),
    )
    db.add(record)
    db.commit()

    return result
