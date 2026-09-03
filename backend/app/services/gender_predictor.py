"""
Gender-aware symptom & injury predictor.

Uses models trained by app/ml/train_gender_model.py on the spreadsheet
knowledge base (Symptoms / Injuries sheets with Male- & Female-Specific Notes).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

import joblib
import numpy as np

_ML_DIR = Path(__file__).parent.parent / "ml"

_sym_models = None
_sym_meta = None
_inj_models = None
_inj_meta = None
_kb = None

GENDER_VALUE = {
    "male": 0.0,
    "m": 0.0,
    "man": 0.0,
    "female": 1.0,
    "f": 1.0,
    "woman": 1.0,
    "other": 0.5,
    "non-binary": 0.5,
    "nonbinary": 0.5,
    "unknown": 0.5,
    "": 0.5,
}


def _norm_gender(g: str | None) -> tuple[str, float]:
    key = (g or "").strip().lower()
    if key not in GENDER_VALUE:
        # fuzzy
        if key.startswith("m"):
            key = "male"
        elif key.startswith("f"):
            key = "female"
        else:
            key = "unknown"
    label = {"male": "male", "female": "female"}.get(key, "unknown")
    if key in ("m", "man"):
        label = "male"
    if key in ("f", "woman"):
        label = "female"
    return label, GENDER_VALUE.get(key, 0.5)


def is_ready() -> bool:
    return (
        (_ML_DIR / "gender_symptom_model.joblib").exists()
        and (_ML_DIR / "gender_symptom_meta.joblib").exists()
        and (_ML_DIR / "gender_kb.json").exists()
    )


def injury_ready() -> bool:
    return (
        (_ML_DIR / "gender_injury_model.joblib").exists()
        and (_ML_DIR / "gender_injury_meta.joblib").exists()
        and (_ML_DIR / "gender_kb.json").exists()
    )


def _load_kb() -> dict:
    global _kb
    if _kb is None:
        _kb = json.loads((_ML_DIR / "gender_kb.json").read_text(encoding="utf-8"))
    return _kb


def _load_sym():
    global _sym_models, _sym_meta
    if _sym_models is None:
        _sym_models = joblib.load(_ML_DIR / "gender_symptom_model.joblib")
        _sym_meta = joblib.load(_ML_DIR / "gender_symptom_meta.joblib")
    return _sym_models, _sym_meta


def _load_inj():
    global _inj_models, _inj_meta
    if _inj_models is None:
        _inj_models = joblib.load(_ML_DIR / "gender_injury_model.joblib")
        _inj_meta = joblib.load(_ML_DIR / "gender_injury_meta.joblib")
    return _inj_models, _inj_meta


def list_symptoms() -> list[dict]:
    kb = _load_kb()
    return [
        {
            "name": s["name"],
            "category": s["category"],
            "severity": s["severity"],
            "has_male_notes": bool(s.get("male_notes")),
            "has_female_notes": bool(s.get("female_notes")),
        }
        for s in kb["symptoms"]
    ]


def list_injuries() -> list[dict]:
    kb = _load_kb()
    return [
        {
            "name": i["name"],
            "body_part": i.get("body_part", ""),
            "category": i["category"],
            "severity": i["severity"],
            "has_male_notes": bool(i.get("male_notes")),
            "has_female_notes": bool(i.get("female_notes")),
        }
        for i in kb["injuries"]
    ]


def _symptom_lookup(name: str) -> dict | None:
    kb = _load_kb()
    name_l = name.strip().lower()
    for s in kb["symptoms"]:
        if s["name"].lower() == name_l:
            return s
    # partial
    for s in kb["symptoms"]:
        if name_l in s["name"].lower() or s["name"].lower() in name_l:
            return s
    return None


def _injury_lookup(name: str) -> dict | None:
    kb = _load_kb()
    name_l = name.strip().lower()
    for s in kb["injuries"]:
        if s["name"].lower() == name_l:
            return s
    for s in kb["injuries"]:
        if name_l in s["name"].lower() or s["name"].lower() in name_l:
            return s
    return None


def _gender_notes(entry: dict, gender_label: str) -> str:
    if gender_label == "male":
        return entry.get("male_notes") or ""
    if gender_label == "female":
        return entry.get("female_notes") or ""
    # unknown: surface both if present
    parts = []
    if entry.get("male_notes"):
        parts.append(f"Male: {entry['male_notes']}")
    if entry.get("female_notes"):
        parts.append(f"Female: {entry['female_notes']}")
    return " | ".join(parts)


def _build_advice(entry: dict, gender_label: str, kind: str = "symptom") -> dict:
    notes = _gender_notes(entry, gender_label)
    if kind == "symptom":
        recommendations = []
        if entry.get("self_care"):
            recommendations.append(entry["self_care"])
        if notes:
            recommendations.append(f"Gender-specific note ({gender_label}): {notes}")
        else:
            recommendations.append(
                "No gender-specific note in the knowledge base for this selection — "
                "general guidance still applies."
            )
        treatment = [entry.get("self_care") or "Follow basic self-care and monitor symptoms."]
        if entry.get("likely_causes"):
            treatment.append(f"Common causes: {entry['likely_causes']}")
        return {
            "explanation": (
                f"{entry['name']} is categorized as {entry.get('category', 'General')} "
                f"with typical severity {entry.get('severity', 'Moderate')}."
            ),
            "recommendations": recommendations,
            "treatment": treatment,
            "red_flags": entry.get("red_flags") or "",
            "when_to_see_doctor": entry.get("when_to_see_doctor") or "See a doctor if symptoms worsen.",
            "gender_notes": notes,
            "likely_causes": entry.get("likely_causes") or "",
            "co_occurs": entry.get("co_occurs") or [],
            "disclaimer": (
                "This is not a medical diagnosis. Gender notes come from a general knowledge "
                "base and may not apply to you — consult a qualified clinician."
            ),
        }

    # injury
    recommendations = []
    if entry.get("first_aid"):
        recommendations.append(f"First aid: {entry['first_aid']}")
    if entry.get("recovery_time"):
        recommendations.append(f"Typical recovery: {entry['recovery_time']}")
    if notes:
        recommendations.append(f"Gender-specific note ({gender_label}): {notes}")
    treatment = [entry.get("first_aid") or "Immobilize, protect the area, and seek care if unsure."]
    if entry.get("common_causes"):
        treatment.append(f"Common causes: {entry['common_causes']}")
    return {
        "explanation": (
            f"{entry['name']} ({entry.get('body_part') or 'body'}) — "
            f"{entry.get('category', 'Injury')}, severity {entry.get('severity', 'Moderate')}."
        ),
        "recommendations": recommendations,
        "treatment": treatment,
        "red_flags": entry.get("red_flags") or "",
        "when_to_see_doctor": entry.get("when_to_see_doctor") or "Seek care if pain/deformity persists.",
        "gender_notes": notes,
        "recovery_time": entry.get("recovery_time") or "",
        "common_causes": entry.get("common_causes") or "",
        "disclaimer": (
            "This is not a medical diagnosis. For serious injuries seek emergency care immediately."
        ),
    }


def predict_symptoms(
    symptoms: Iterable[str],
    gender: str | None = None,
    intensity: float = 0.7,
) -> dict:
    """
    symptoms: list of symptom names from the catalog (or free text matched loosely)
    gender: male | female | other/unknown
    intensity: 0-1 overall how bad the user feels
    """
    models, meta = _load_sym()
    gender_label, gval = _norm_gender(gender)
    intensity = float(np.clip(intensity, 0.0, 1.0))

    names: list[str] = meta["symptom_names"]
    name_to_idx = {n.lower(): i for i, n in enumerate(names)}

    selected = set()
    matched = []
    unmatched = []
    for raw in symptoms:
        key = (raw or "").strip()
        if not key:
            continue
        idx = name_to_idx.get(key.lower())
        if idx is None:
            # fuzzy contains
            found = None
            for n, i in name_to_idx.items():
                if key.lower() in n or n in key.lower():
                    found = i
                    break
            if found is None:
                unmatched.append(key)
                continue
            idx = found
        selected.add(idx)
        matched.append(names[idx])

    if not selected:
        raise ValueError(
            "No recognized symptoms. Pick from the catalog returned by GET /api/gender-ml/symptoms."
        )

    v = np.zeros(len(names) + 2, dtype=np.float32)
    for i in selected:
        v[i] = 1.0
    v[-2] = intensity
    v[-1] = gval
    X = v.reshape(1, -1)

    primary_model = models["primary"]
    sev_model = models["severity"]
    cat_model = models["category"]
    sev_le = meta["severity_encoder"]
    cat_le = meta["category_encoder"]

    probs = primary_model.predict_proba(X)[0]
    classes = primary_model.classes_
    prob_map = {int(cls): float(p) for cls, p in zip(classes, probs)}

    # Prefer ranking among user-selected symptoms (model score + severity weight),
    # then list other model suggestions as differentials.
    sev_weight = {"Emergency": 0.12, "Severe": 0.08, "Moderate": 0.04, "Mild": 0.0}
    selected_scored = []
    for idx in selected:
        entry_i = _symptom_lookup(names[idx]) or {}
        sw = sev_weight.get(entry_i.get("severity") or "Mild", 0.0)
        score = prob_map.get(idx, 0.0) + 0.35 + sw  # strong bias to what user picked
        selected_scored.append((idx, score))
    selected_scored.sort(key=lambda t: t[1], reverse=True)

    others = sorted(
        ((i, p) for i, p in prob_map.items() if i not in selected),
        key=lambda t: t[1],
        reverse=True,
    )
    # Build display list: selected first (renormalized among themselves), then others
    sel_total = sum(s for _, s in selected_scored) or 1.0
    ranked_display = [(i, s / sel_total * 0.75) for i, s in selected_scored]
    other_mass = 0.25
    oth_total = sum(p for _, p in others[:12]) or 1.0
    ranked_display += [(i, (p / oth_total) * other_mass) for i, p in others[:12]]
    # final renorm
    tot = sum(p for _, p in ranked_display) or 1.0
    ranked_display = [(i, p / tot) for i, p in ranked_display]

    top_idx, top_p = ranked_display[0]
    top_name = names[top_idx]
    entry = _symptom_lookup(top_name) or {
        "name": top_name,
        "category": "General",
        "severity": "Moderate",
        "self_care": "",
        "male_notes": "",
        "female_notes": "",
        "red_flags": "",
        "when_to_see_doctor": "",
        "likely_causes": "",
        "co_occurs": [],
    }

    sev_pred = int(sev_model.predict(X)[0])
    cat_pred = int(cat_model.predict(X)[0])
    severity = str(sev_le.inverse_transform([sev_pred])[0])
    category = str(cat_le.inverse_transform([cat_pred])[0])
    # Prefer KB severity/category for the top condition when available
    severity = entry.get("severity") or severity
    category = entry.get("category") or category

    advice = _build_advice(entry, gender_label, kind="symptom")

    probabilities = [
        {
            "condition": names[i],
            "confidence": round(p * 100, 1),
            "category": (_symptom_lookup(names[i]) or {}).get("category", ""),
            "severity": (_symptom_lookup(names[i]) or {}).get("severity", ""),
        }
        for i, p in ranked_display[:8]
    ]

    return {
        "condition": top_name,
        "confidence": round(top_p * 100, 1),
        "severity": severity,
        "category": category,
        "gender": gender_label,
        "matched_symptoms": matched,
        "unmatched_symptoms": unmatched,
        "probabilities": probabilities,
        **advice,
    }


def predict_injury(
    injury_hint: str | None = None,
    body_part: str | None = None,
    gender: str | None = None,
    intensity: float = 0.7,
) -> dict:
    models, meta = _load_inj()
    gender_label, gval = _norm_gender(gender)
    intensity = float(np.clip(intensity, 0.0, 1.0))

    names: list[str] = meta["injury_names"]
    body_parts: list[str] = meta.get("body_parts") or []
    name_to_idx = {n.lower(): i for i, n in enumerate(names)}
    bp_index = {b: i for i, b in enumerate(body_parts)}

    n_feat = len(names) + len(body_parts) + 2
    v = np.zeros(n_feat, dtype=np.float32)

    selected = None
    if injury_hint:
        key = injury_hint.strip().lower()
        if key in name_to_idx:
            selected = name_to_idx[key]
        else:
            for n, i in name_to_idx.items():
                if key in n or n in key:
                    selected = i
                    break
    if selected is not None:
        v[selected] = 1.0
        # soft activate same body-part injuries
        bp = body_part or (meta and names and (_injury_lookup(names[selected]) or {}).get("body_part"))
        if bp:
            for j, n in enumerate(names):
                ent = _injury_lookup(n)
                if ent and ent.get("body_part") == bp and j != selected:
                    v[j] = max(v[j], 0.25)
    elif body_part:
        # activate all injuries for that body part lightly
        bp_l = body_part.strip().lower()
        for j, n in enumerate(names):
            ent = _injury_lookup(n)
            if ent and (ent.get("body_part") or "").lower() == bp_l:
                v[j] = 0.6
        # exact bp one-hot
        for b, i in bp_index.items():
            if b.lower() == bp_l:
                v[len(names) + i] = 1.0
                break
    else:
        raise ValueError("Provide injury_hint and/or body_part.")

    if body_part:
        bp_l = body_part.strip().lower()
        for b, i in bp_index.items():
            if b.lower() == bp_l:
                v[len(names) + i] = 1.0
                break

    v[-2] = intensity
    v[-1] = gval
    X = v.reshape(1, -1)

    primary_model = models["primary"]
    sev_model = models["severity"]
    probs = primary_model.predict_proba(X)[0]
    classes = primary_model.classes_
    ranked = sorted(
        [(int(cls), float(p)) for cls, p in zip(classes, probs)],
        key=lambda t: t[1],
        reverse=True,
    )
    if selected is not None:
        ranked = [((i, p + 0.2) if i == selected else (i, p)) for i, p in ranked]
        ranked.sort(key=lambda t: t[1], reverse=True)
        total = sum(p for _, p in ranked) or 1.0
        ranked = [(i, p / total) for i, p in ranked]

    top_idx, top_p = ranked[0]
    top_name = names[top_idx]
    entry = _injury_lookup(top_name) or {
        "name": top_name,
        "body_part": body_part or "",
        "category": "Injury",
        "severity": "Moderate",
        "first_aid": "",
        "male_notes": "",
        "female_notes": "",
        "red_flags": "",
        "when_to_see_doctor": "",
        "recovery_time": "",
        "common_causes": "",
    }

    sev_pred = int(sev_model.predict(X)[0])
    severity = str(meta["severity_encoder"].inverse_transform([sev_pred])[0])
    severity = entry.get("severity") or severity

    advice = _build_advice(entry, gender_label, kind="injury")
    probabilities = [
        {
            "condition": names[i],
            "confidence": round(p * 100, 1),
            "category": (_injury_lookup(names[i]) or {}).get("category", ""),
            "severity": (_injury_lookup(names[i]) or {}).get("severity", ""),
        }
        for i, p in ranked[:8]
    ]

    return {
        "condition": top_name,
        "confidence": round(top_p * 100, 1),
        "severity": severity,
        "category": entry.get("category") or "",
        "body_part": entry.get("body_part") or body_part or "",
        "gender": gender_label,
        "probabilities": probabilities,
        **advice,
    }
