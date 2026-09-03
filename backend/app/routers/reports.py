import json

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import ReportAnalysisResponse
from app.services.ocr_service import extract_text
from app.services.ollama_service import analyze_report_text
from app.services import offline_fallback, report_ml_predictor

router = APIRouter(prefix="/api/reports", tags=["Report Scanner"])

ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "text/plain"}
MAX_SIZE_MB = 10


@router.get("/ml-status")
def ml_status():
    return {"ready": report_ml_predictor.is_ready()}


@router.post("/scan", response_model=ReportAnalysisResponse)
async def scan_report(
    file: UploadFile = File(...),
    language: str = Form("en"),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES and not (file.filename or "").lower().endswith(
        (".pdf", ".jpg", ".jpeg", ".png", ".txt")
    ):
        raise HTTPException(400, "Only PDF, JPG, PNG, and TXT files are supported.")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(400, f"File must be under {MAX_SIZE_MB}MB.")

    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "report"

    raw_text = ""
    try:
        if filename.lower().endswith(".txt") or content_type.startswith("text/"):
            raw_text = file_bytes.decode("utf-8", errors="ignore")
        else:
            raw_text = extract_text(file_bytes, content_type)
    except Exception:
        try:
            raw_text = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            raw_text = ""

    result = None
    source = "unknown"

    if (raw_text or "").strip() and report_ml_predictor.is_ready():
        try:
            result = report_ml_predictor.predict_from_text(raw_text, filename)
            source = "report_ml"
            # If ML found no metrics, try ollama/offline for narrative
            if not result.get("metrics"):
                result = None
        except Exception:
            result = None

    if result is None:
        if not (raw_text or "").strip():
            result = {
                "metrics": [],
                "findings": (
                    "Could not read text from this file (OCR may be unavailable). "
                    "Try a text-based PDF export from your lab."
                ),
                "confidence": 25,
                "recommendations": [
                    "Ask the lab for a digital / text PDF.",
                    "Photograph the report in bright, even light if using an image.",
                    "Share the original report with your doctor for interpretation.",
                ],
                "disclaimer": "Offline mode could not extract text. Not a medical diagnosis.",
            }
            source = "offline"
        else:
            try:
                result = analyze_report_text(raw_text, filename, language)
                source = "ollama"
            except Exception:
                # Prefer ML even with partial parse; else regex offline
                if report_ml_predictor.is_ready():
                    try:
                        result = report_ml_predictor.predict_from_text(raw_text, filename)
                        source = "report_ml"
                    except Exception:
                        result = offline_fallback.analyze_report_text_offline(
                            raw_text, filename, language
                        )
                        source = "offline"
                else:
                    result = offline_fallback.analyze_report_text_offline(
                        raw_text, filename, language
                    )
                    source = "offline"

    result.setdefault("metrics", [])
    result.setdefault("findings", "")
    result.setdefault("confidence", 50)
    result.setdefault("recommendations", [])
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Please consult a doctor to interpret your report.",
    )

    label = "Unreadable"
    if result["metrics"]:
        if all(m.get("status") == "Normal" for m in result["metrics"]):
            label = "Normal"
        else:
            label = result.get("overall_status") or result.get("pattern") or "Attention needed"

    record = Analysis(
        analysis_type="report",
        title=filename,
        input_summary=f"source={source}",
        result_label=str(label)[:120],
        confidence=result["confidence"],
        severity=result.get("overall_status"),
        details_json=json.dumps({**result, "source": source}),
    )
    db.add(record)
    db.commit()

    return {
        "metrics": result["metrics"],
        "findings": result["findings"],
        "confidence": result["confidence"],
        "recommendations": result["recommendations"],
        "disclaimer": result["disclaimer"],
    }
