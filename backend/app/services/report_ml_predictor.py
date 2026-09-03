"""
ML Report Scanner: parse lab values from report text, build a feature vector,
and classify overall status + clinical pattern with trained models.
"""
from __future__ import annotations

import re
from pathlib import Path

import joblib
import numpy as np

_ML_DIR = Path(__file__).parent.parent / "ml"
_MODEL_PATH = _ML_DIR / "report_ml_model.joblib"
_META_PATH = _ML_DIR / "report_ml_meta.joblib"

_bundle = None
_meta = None

# Patterns: feature key → regexes to find a numeric value in report text
_PARSE_PATTERNS: dict[str, list[str]] = {
    "Hemoglobin": [r"(?:hemoglobin|haemoglobin|hb|hgb)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "WBC": [r"(?:wbc|white blood(?: cell)?s?|leucocyte[s]?|leukocyte[s]?)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "Platelets": [r"(?:platelet[s]?|plt)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "RBC": [r"(?:rbc|red blood(?: cell)?s?)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "Glucose": [r"(?:glucose|blood sugar|fbs|rbs|fbg|ppbs|fasting sugar)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "Creatinine": [r"(?:creatinine|creat\.?)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "Urea": [r"(?:blood\s*urea|urea|bun)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "Cholesterol": [r"(?:total\s*)?cholesterol\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "HDL": [r"hdl(?:\s*cholesterol)?\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "LDL": [r"ldl(?:\s*cholesterol)?\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "Triglycerides": [r"(?:triglyceride[s]?|tg)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "TSH": [r"tsh\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "Vitamin_D": [r"(?:vitamin\s*d|25[\s\-]?oh(?:d)?|vit\.?\s*d)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "ALT": [r"(?:alt|sgpt)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
    "AST": [r"(?:ast|sgot)\s*[:=]?\s*(\d+(?:\.\d+)?)"],
}


def is_ready() -> bool:
    return _MODEL_PATH.exists() and _META_PATH.exists()


def _load():
    global _bundle, _meta
    if _bundle is None:
        if not is_ready():
            raise FileNotFoundError(
                "Report ML model missing. Run: python -m app.ml.train_injury_report_models"
            )
        _bundle = joblib.load(_MODEL_PATH)
        _meta = joblib.load(_META_PATH)
    return _bundle, _meta


def parse_lab_values(text: str) -> dict[str, float]:
    lower = (text or "").lower()
    found: dict[str, float] = {}
    for key, patterns in _PARSE_PATTERNS.items():
        for pat in patterns:
            m = re.search(pat, lower, flags=re.I)
            if m:
                try:
                    found[key] = float(m.group(1))
                    break
                except ValueError:
                    continue
    return found


def _status_for_value(name: str, value: float, meta: dict) -> str:
    ref = (meta.get("lab_ref") or {}).get(name)
    if not ref:
        return "Normal"
    low, high, _unit = ref
    if value < low:
        return "Low"
    if value > high:
        return "High"
    return "Normal"


def build_feature_vector(labs: dict[str, float], meta: dict) -> np.ndarray:
    features = meta["feature_names"]
    normal = meta["lab_normal"]
    vec = []
    for f in features:
        if f not in labs:
            vec.append(-1.0)
            continue
        mu, sd = normal[f]
        z = (labs[f] - mu) / (sd + 1e-6)
        vec.append(float(z))
    return np.asarray(vec, dtype=np.float32)


def predict_from_text(report_text: str, filename: str = "") -> dict:
    bundle, meta = _load()
    labs = parse_lab_values(report_text)

    metrics = []
    for name, value in labs.items():
        ref = (meta.get("lab_ref") or {}).get(name, (None, None, ""))
        unit = ref[2] if ref else ""
        status = _status_for_value(name, value, meta)
        display = name.replace("_", " ")
        metrics.append(
            {
                "name": display,
                "value": f"{value} {unit}".strip(),
                "status": status,
            }
        )

    if not labs:
        return {
            "metrics": [],
            "findings": (
                f"ML report model could not detect standard lab labels in “{filename or 'report'}”. "
                "Try a clearer text PDF or a report that lists test names with numbers."
            ),
            "confidence": 28.0,
            "recommendations": [
                "Upload a digital/text lab PDF when possible.",
                "Ensure test names (Hemoglobin, Glucose, etc.) are readable.",
                "Share the original report with your doctor for interpretation.",
            ],
            "pattern": "Unknown",
            "overall_status": "Unknown",
            "source": "report_ml",
            "disclaimer": (
                "Offline ML parse — not a medical diagnosis. Always interpret labs with a clinician."
            ),
        }

    X = build_feature_vector(labs, meta).reshape(1, -1)
    status_model = bundle["status_model"]
    pattern_model = bundle["pattern_model"]
    status_le = bundle["status_encoder"]
    pattern_le = bundle["pattern_encoder"]

    st_probs = status_model.predict_proba(X)[0]
    st_idx = int(np.argmax(st_probs))
    overall = str(status_le.inverse_transform([status_model.classes_[st_idx]])[0])
    st_conf = float(st_probs[st_idx])

    pat_probs = pattern_model.predict_proba(X)[0]
    pat_idx = int(np.argmax(pat_probs))
    pattern = str(pattern_le.inverse_transform([pattern_model.classes_[pat_idx]])[0])
    pat_conf = float(pat_probs[pat_idx])

    # If many metrics abnormal, escalate status heuristically
    abnormal = [m for m in metrics if m["status"] != "Normal"]
    if len(abnormal) >= 3 and overall == "Normal":
        overall = "Attention"
    if any(m["name"] in ("Hemoglobin", "Platelets", "Glucose", "Creatinine") and m["status"] != "Normal" for m in abnormal):
        if overall == "Normal":
            overall = "Attention"

    confidence = round(max(st_conf, pat_conf) * 100, 1)
    confidence = max(confidence, 40.0)

    pattern_note = (meta.get("pattern_advice") or {}).get(pattern) or ""
    findings_parts = [
        f"ML overall status: {overall} (pattern: {pattern}).",
        f"Parsed {len(metrics)} lab value(s) from “{filename or 'report'}”.",
    ]
    if abnormal:
        findings_parts.append(
            "Flagged: " + ", ".join(f"{m['name']} ({m['status']})" for m in abnormal[:6]) + "."
        )
    else:
        findings_parts.append("No values outside common adult reference ranges in the parsed set.")
    if pattern_note:
        findings_parts.append(pattern_note)
    findings = " ".join(findings_parts)

    recs = list((meta.get("advice") or {}).get(overall) or [
        "Discuss this report with your doctor.",
        "Reference ranges vary by lab, age, and sex.",
    ])
    if pattern_note and pattern_note not in recs:
        recs.insert(0, pattern_note)

    # top alternate patterns
    pat_ranked = sorted(
        [
            (str(pattern_le.inverse_transform([int(c)])[0]), float(p))
            for c, p in zip(pattern_model.classes_, pat_probs)
        ],
        key=lambda t: t[1],
        reverse=True,
    )

    return {
        "metrics": metrics,
        "findings": findings,
        "confidence": confidence,
        "recommendations": recs[:6],
        "pattern": pattern,
        "overall_status": overall,
        "pattern_probabilities": [
            {"pattern": n, "confidence": round(p * 100, 1)} for n, p in pat_ranked[:5]
        ],
        "source": "report_ml",
        "disclaimer": (
            "ML lab interpretation using common adult ranges — not a medical diagnosis. "
            "Ranges differ by lab/age/sex; always confirm with a qualified clinician."
        ),
    }
