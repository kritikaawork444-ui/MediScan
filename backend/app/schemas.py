"""
Pydantic schemas: define the exact shape of JSON that comes in/out of the API.
FastAPI uses these to validate requests and auto-generate the /docs page.
"""
from datetime import datetime, timezone
from typing import Optional, List

from pydantic import BaseModel, field_serializer


# ---------- Symptom Checker ----------

class SymptomCheckRequest(BaseModel):
    symptoms: List[str]
    pain_location: Optional[str] = None
    pain_description: Optional[str] = None
    notes: Optional[str] = None
    language: Optional[str] = "en"  # "en" | "hi" | "hinglish"


class PossibleCause(BaseModel):
    condition: str
    confidence: float
    why: str = ""


class OllamaSymptomCheckResponse(BaseModel):
    condition: str
    confidence: float
    possible_causes: List[PossibleCause]
    recommendations: List[str]
    treatment: List[str]
    disclaimer: str


# ---------- Report Scanner ----------

class ReportMetric(BaseModel):
    name: str
    value: str
    status: str  # "Normal" | "Low" | "High"


class ReportAnalysisResponse(BaseModel):
    metrics: List[ReportMetric]
    findings: str
    confidence: float
    recommendations: List[str]
    disclaimer: str


# ---------- Injury Analyzer ----------

class InjuryAnalysisResponse(BaseModel):
    injury_type: str
    severity: str
    confidence: float
    treatment_suggestions: List[str]
    disclaimer: str
    is_injury: bool = True


# ---------- Encyclopedia AI Lookup ----------

class DiseaseLookupRequest(BaseModel):
    query: str
    language: Optional[str] = "en"  # "en" | "hi" | "hinglish"


class DiseaseLookupResponse(BaseModel):
    name: str
    category: str
    risk_level: str
    description: str
    symptoms: str
    causes: str
    treatment: List[str]
    disclaimer: str
    source: str  # "cache" | "ai"


# ---------- ML Symptom Predictor (trained model + Ollama treatment) ----------

class MLPredictRequest(BaseModel):
    fever: float
    headache: float
    cough: float
    fatigue: float
    body_pain: float
    language: Optional[str] = "en"  # "en" | "hi" | "hinglish"


class DiseaseProbability(BaseModel):
    disease: str
    confidence: float


class MLPredictResponse(BaseModel):
    disease: str
    confidence: float
    probabilities: List[DiseaseProbability]
    explanation: str
    recommendations: List[str]
    treatment: List[str]
    when_to_see_doctor: str
    disclaimer: str


# ---------- Gender-aware ML (spreadsheet KB) ----------

class GenderSymptomPredictRequest(BaseModel):
    symptoms: List[str]
    gender: Optional[str] = "unknown"  # male | female | other | unknown
    intensity: Optional[float] = 0.7  # 0-1 overall severity feeling


class GenderConditionProb(BaseModel):
    condition: str
    confidence: float
    category: str = ""
    severity: str = ""


class GenderSymptomPredictResponse(BaseModel):
    condition: str
    confidence: float
    severity: str
    category: str
    gender: str
    matched_symptoms: List[str]
    unmatched_symptoms: List[str] = []
    probabilities: List[GenderConditionProb]
    explanation: str
    recommendations: List[str]
    treatment: List[str]
    red_flags: str = ""
    when_to_see_doctor: str
    gender_notes: str = ""
    likely_causes: str = ""
    co_occurs: List[str] = []
    disclaimer: str


class GenderInjuryPredictRequest(BaseModel):
    injury_hint: Optional[str] = None
    body_part: Optional[str] = None
    gender: Optional[str] = "unknown"
    intensity: Optional[float] = 0.7


class GenderInjuryPredictResponse(BaseModel):
    condition: str
    confidence: float
    severity: str
    category: str
    body_part: str = ""
    gender: str
    probabilities: List[GenderConditionProb]
    explanation: str
    recommendations: List[str]
    treatment: List[str]
    red_flags: str = ""
    when_to_see_doctor: str
    gender_notes: str = ""
    recovery_time: str = ""
    common_causes: str = ""
    disclaimer: str


# ---------- History ----------

class AnalysisOut(BaseModel):
    id: int
    analysis_type: str
    title: str
    input_summary: Optional[str]
    result_label: str
    confidence: Optional[float]
    severity: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        """Always emit ISO-8601 UTC with a Z suffix so browsers convert to local time."""
        if value is None:
            return value
        if value.tzinfo is None:
            # Legacy naive rows were stored as UTC via datetime.utcnow()
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        # 2026-09-02T16:51:55.992827Z
        return value.isoformat().replace("+00:00", "Z")
