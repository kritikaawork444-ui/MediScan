import json

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import InjuryAnalysisResponse
from app.services.ollama_service import analyze_injury_image
from app.services import offline_fallback, injury_ml_predictor

router = APIRouter(prefix="/api/injury", tags=["Injury Analyzer"])

ALLOWED_TYPES = {"image/jpeg", "image/png"}
MAX_SIZE_MB = 10


@router.get("/ml-status")
def ml_status():
    ready = injury_ml_predictor.is_ready()
    info = {"ready": ready}
    if ready:
        try:
            _, meta = injury_ml_predictor._load()
            info["classes"] = len(meta.get("type_classes") or [])
            info["not_injury_label"] = meta.get("not_injury_label")
            info["has_not_injury_class"] = bool(meta.get("not_injury_label"))
        except Exception as e:
            info["error"] = str(e)
    return info


@router.post("/analyze", response_model=InjuryAnalysisResponse)
async def analyze_injury(
    file: UploadFile = File(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPG and PNG images are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File must be under {MAX_SIZE_MB}MB.")

    result = None
    source = "unknown"

    # 1) Dedicated injury ML model (always offline) — rejects non-injury photos
    if injury_ml_predictor.is_ready():
        try:
            result = injury_ml_predictor.predict_from_image(file_bytes)
            source = "injury_ml"
        except Exception:
            result = None

    # 2) Ollama vision if ML unavailable
    if result is None:
        try:
            result = analyze_injury_image(file_bytes, file.content_type, language)
            source = "ollama"
        except Exception:
            result = offline_fallback.analyze_injury_image_offline(
                file_bytes, file.content_type, language
            )
            source = "offline"

    result.setdefault("injury_type", "Unable to determine")
    result.setdefault("severity", "Moderate")
    result.setdefault("confidence", 40)
    result.setdefault("treatment_suggestions", [])
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Seek in-person care for anything serious.",
    )

    is_injury = result.get("is_injury")
    if is_injury is None:
        itype = str(result.get("injury_type") or "")
        is_injury = not (
            itype.startswith("Not an injury")
            or "unrelated" in itype.lower()
            or itype == "Unable to determine"
        )
    result["is_injury"] = bool(is_injury)

    # UI severity colors expect Low/Moderate/High — normalize Emergency/Mild
    sev = result.get("severity") or "Moderate"
    if not result["is_injury"]:
        result["severity"] = "Low"
    elif sev in ("Mild", "Low"):
        result["severity"] = "Low"
    elif sev in ("Severe", "High", "Emergency"):
        result["severity"] = "High"
    elif sev not in ("Low", "Moderate", "High"):
        result["severity"] = "Moderate"

    record = Analysis(
        analysis_type="injury",
        title=file.filename or "injury",
        input_summary=f"source={source};is_injury={result['is_injury']}",
        result_label=result["injury_type"],
        confidence=result["confidence"],
        severity=result["severity"],
        details_json=json.dumps({**result, "source": source}),
    )
    db.add(record)
    db.commit()

    return {
        "injury_type": result["injury_type"],
        "severity": result["severity"],
        "confidence": result["confidence"],
        "treatment_suggestions": result["treatment_suggestions"],
        "disclaimer": result["disclaimer"],
        "is_injury": bool(result.get("is_injury", True)),
    }
