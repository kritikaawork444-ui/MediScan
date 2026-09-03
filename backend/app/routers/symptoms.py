import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import SymptomCheckRequest, OllamaSymptomCheckResponse
from app.services import ollama_service, offline_fallback
from app.services.result_i18n import localize_symptom_result

router = APIRouter(prefix="/api/symptoms", tags=["Symptom Checker"])


@router.post("/check-ollama", response_model=OllamaSymptomCheckResponse)
def check_symptoms_ollama(payload: SymptomCheckRequest, db: Session = Depends(get_db)):
    """Symptom checker: tries local Ollama first, then offline knowledge-base guide."""
    if not payload.symptoms:
        raise HTTPException(400, "Select at least one symptom.")

    try:
        result = ollama_service.analyze_symptoms(
            payload.symptoms,
            payload.notes,
            payload.pain_location,
            payload.pain_description,
            payload.language or "en",
        )
        source = "ollama"
    except Exception:
        # Any Ollama failure (down, timeout, bad JSON path, etc.) -> offline result
        result = offline_fallback.analyze_symptoms_offline(
            payload.symptoms,
            payload.notes,
            payload.pain_location,
            payload.pain_description,
            payload.language or "en",
        )
        source = "offline"

    result.setdefault("possible_causes", [])
    result.setdefault("recommendations", [])
    result.setdefault("treatment", [])
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Please consult a doctor for proper care.",
    )
    # Localize offline/English payload when user chose Hindi or Hinglish
    result = localize_symptom_result(result, payload.language or "en")
    # Ensure top-level condition/confidence from first cause if missing
    if not result.get("condition") and result["possible_causes"]:
        result["condition"] = result["possible_causes"][0].get("condition", "Unknown")
        result["confidence"] = result["possible_causes"][0].get("confidence", 50)

    summary_parts = [", ".join(payload.symptoms)]
    if payload.pain_location:
        summary_parts.append(f"Location: {payload.pain_location}")
    if payload.pain_description:
        summary_parts.append(f"Feels: {payload.pain_description}")

    title = "Symptom Check (Local AI)" if source == "ollama" else "Symptom Check (Offline guide)"
    record = Analysis(
        analysis_type="symptom",
        title=title,
        input_summary=" | ".join(summary_parts),
        result_label=result["condition"],
        confidence=result.get("confidence"),
        severity=None,
        details_json=json.dumps({**result, "source": source}),
    )
    db.add(record)
    db.commit()

    return result
