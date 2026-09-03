"""
Loads the RandomForestClassifier trained on dataset1.csv (see
app/ml/train_model.py) and turns raw symptom scores into a predicted
disease + confidence + full probability breakdown.

This is a completely separate, local, offline model from Ollama - it's a
classic ML model (scikit-learn), not an LLM. Ollama is used afterwards
(in ollama_service.generate_treatment_plan) to turn the predicted disease
into plain-language treatment advice.
"""
from pathlib import Path

import joblib
import pandas as pd

_ML_DIR = Path(__file__).parent.parent / "ml"
_MODEL_PATH = _ML_DIR / "disease_model.joblib"
_ENCODER_PATH = _ML_DIR / "label_encoder.joblib"

FEATURE_ORDER = ["Fever", "Headache", "Cough", "Fatigue", "Body_Pain"]

_model = None
_encoder = None


def _load():
    global _model, _encoder
    if _model is None or _encoder is None:
        if not _MODEL_PATH.exists() or not _ENCODER_PATH.exists():
            raise FileNotFoundError(
                "Trained model not found. Run `python -m app.ml.train_model "
                "path/to/dataset1.csv` from the backend/ folder first."
            )
        _model = joblib.load(_MODEL_PATH)
        _encoder = joblib.load(_ENCODER_PATH)
    return _model, _encoder


def is_ready() -> bool:
    return _MODEL_PATH.exists() and _ENCODER_PATH.exists()


def predict(fever: float, headache: float, cough: float, fatigue: float, body_pain: float) -> dict:
    """Returns the top predicted disease plus a full ranked probability
    breakdown across every disease the model was trained on."""
    model, encoder = _load()

    row = pd.DataFrame([[fever, headache, cough, fatigue, body_pain]], columns=FEATURE_ORDER)
    probs = model.predict_proba(row)[0]

    ranked = sorted(
        zip(encoder.classes_, probs),
        key=lambda pair: pair[1],
        reverse=True,
    )

    top_disease, top_prob = ranked[0]
    return {
        "disease": top_disease,
        "confidence": round(float(top_prob) * 100, 1),
        "probabilities": [
            {"disease": name, "confidence": round(float(p) * 100, 1)} for name, p in ranked
        ],
    }
