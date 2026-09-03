"""
Trains gender-aware symptom & injury models from the spreadsheet knowledge base.

Source: app/ml/data/gender_dataset.xlsx  (Symptoms + Injuries sheets)

Because the sheet is a structured knowledge base (not a huge patient table), we
build synthetic labeled samples from:
  - primary symptom/injury rows
  - "Commonly Co-occurs With" / related fields
  - Male-Specific / Female-Specific notes (as a gender feature signal)
  - Severity labels

Artifacts written next to this script:
  gender_symptom_model.joblib
  gender_symptom_meta.joblib
  gender_injury_model.joblib
  gender_injury_meta.joblib
  gender_kb.json                 - full searchable knowledge base for the API
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

ML_DIR = Path(__file__).parent
DATA_DIR = ML_DIR / "data"
DEFAULT_XLSX = DATA_DIR / "gender_dataset.xlsx"

SEVERITY_ORDER = {
    "mild": 0,
    "mild to moderate": 1,
    "moderate": 2,
    "mild to severe": 2,
    "moderate to severe": 3,
    "severe": 3,
    "emergency": 4,
}

GENDER_MAP = {"male": 0.0, "female": 1.0, "other": 0.5, "unknown": 0.5, "": 0.5}


def _norm_sev(s: str) -> str:
    s = (s or "").strip().lower()
    # collapse ranges to the higher risk for training labels
    if "emergency" in s:
        return "Emergency"
    if "severe" in s and "mild" in s:
        return "Severe"
    if "moderate to severe" in s or "severe" in s:
        return "Severe" if "to severe" in s or s == "severe" else "Moderate"
    if s in ("severe",):
        return "Severe"
    if "moderate" in s:
        return "Moderate"
    if "mild" in s:
        return "Mild"
    return "Moderate"


def _split_list(text: str) -> list[str]:
    if not text or (isinstance(text, float) and np.isnan(text)):
        return []
    parts = re.split(r"[,;/]| and ", str(text))
    return [p.strip() for p in parts if p and p.strip()]


def _clean_df_symptoms(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.strip() for c in df.columns]
    for c in df.columns:
        if df[c].dtype == object:
            df[c] = df[c].fillna("").astype(str).str.strip()
    # Prefer rows that have richer gender notes when names duplicate
    df["_has_gender"] = (
        (df.get("Male-Specific Notes", "") != "").astype(int)
        + (df.get("Female-Specific Notes", "") != "").astype(int)
    )
    df["_sev_rank"] = df["Severity"].map(lambda s: SEVERITY_ORDER.get(_norm_sev(s).lower(), 2))
    df = df.sort_values(["Symptom", "_has_gender", "_sev_rank"], ascending=[True, False, False])
    # keep first (richest) per symptom name for the catalog, but train on all rows
    return df


def _clean_df_injuries(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [c.strip() for c in df.columns]
    for c in df.columns:
        if df[c].dtype == object:
            df[c] = df[c].fillna("").astype(str).str.strip()
    return df


def build_kb(sym_df: pd.DataFrame, inj_df: pd.DataFrame) -> dict:
    """Deduped knowledge base used at inference for advice text."""
    # richest row per symptom
    sym_best = (
        sym_df.assign(
            _g=(sym_df["Male-Specific Notes"].ne("").astype(int)
                + sym_df["Female-Specific Notes"].ne("").astype(int))
        )
        .sort_values(["Symptom", "_g"], ascending=[True, False])
        .drop_duplicates("Symptom", keep="first")
    )
    symptoms = []
    for _, r in sym_best.iterrows():
        symptoms.append(
            {
                "name": r["Symptom"],
                "category": r["Category"],
                "likely_causes": r["Likely Causes"],
                "severity": _norm_sev(r["Severity"]),
                "severity_raw": r["Severity"],
                "co_occurs": _split_list(r["Commonly Co-occurs With"]),
                "red_flags": r["Red Flag / Emergency Signs"],
                "self_care": r["Self-Care Tips"],
                "male_notes": r["Male-Specific Notes"],
                "female_notes": r["Female-Specific Notes"],
                "when_to_see_doctor": r["When to See a Doctor"],
            }
        )

    inj_best = inj_df.drop_duplicates("Injury Type", keep="first")
    injuries = []
    for _, r in inj_best.iterrows():
        injuries.append(
            {
                "name": r["Injury Type"],
                "body_part": r.get("Body Part", ""),
                "category": r["Category"],
                "severity": _norm_sev(r["Severity"]),
                "severity_raw": r["Severity"],
                "common_causes": r["Common Causes"],
                "first_aid": r["First Aid Steps"],
                "red_flags": r["Red Flag / Emergency Signs"],
                "recovery_time": r.get("Typical Recovery Time", ""),
                "male_notes": r.get("Male-Specific Notes", ""),
                "female_notes": r.get("Female-Specific Notes", ""),
                "when_to_see_doctor": r["When to See a Doctor"],
            }
        )
    return {"symptoms": symptoms, "injuries": injuries}


def _token_set(name: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", name.lower()) if len(t) > 2}


def build_symptom_training(sym_df: pd.DataFrame, catalog: list[dict], n_noise: int = 4):
    """
    Feature vector:
      [ multi-hot over catalog symptom names | intensity mean | gender ]
    Labels:
      primary_symptom_idx, severity, category
    """
    names = [c["name"] for c in catalog]
    name_to_idx = {n: i for i, n in enumerate(names)}
    # map free-text co-occur tokens -> catalog indices
    token_index: dict[str, list[int]] = {}
    for i, c in enumerate(catalog):
        for tok in _token_set(c["name"]):
            token_index.setdefault(tok, []).append(i)
        for co in c["co_occurs"]:
            for tok in _token_set(co):
                token_index.setdefault(tok, []).append(i)

    cat_le = LabelEncoder()
    sev_le = LabelEncoder()
    categories = [c["category"] for c in catalog]
    severities = [c["severity"] for c in catalog]
    cat_le.fit(categories)
    sev_le.fit(sorted(set(severities) | {"Mild", "Moderate", "Severe", "Emergency"}))

    rng = np.random.default_rng(42)
    X_rows = []
    y_primary = []
    y_sev = []
    y_cat = []

    def vec(selected_idx: set[int], gender: float, intensity: float) -> np.ndarray:
        v = np.zeros(len(names) + 2, dtype=np.float32)
        for i in selected_idx:
            v[i] = 1.0
        v[-2] = intensity
        v[-1] = gender
        return v

    # For every catalog entry, generate male / female / unknown samples
    for primary_i, entry in enumerate(catalog):
        # resolve co-occurring catalog matches
        co_idxs = set()
        for co in entry["co_occurs"]:
            toks = _token_set(co)
            for t in toks:
                for j in token_index.get(t, []):
                    if j != primary_i:
                        co_idxs.add(j)
        co_list = list(co_idxs)

        base_sev = entry["severity"]
        base_cat = entry["category"]

        for gender_name, gval in (("male", 0.0), ("female", 1.0), ("unknown", 0.5)):
            # bias: if only one gender has notes, prefer that gender samples a bit more weight via duplicates
            has_m = bool(entry["male_notes"])
            has_f = bool(entry["female_notes"])
            repeats = 2
            if gender_name == "male" and has_m:
                repeats = 3
            if gender_name == "female" and has_f:
                repeats = 3

            for _ in range(repeats):
                selected = {primary_i}
                # add 0-3 co-occurring symptoms
                k = int(rng.integers(0, min(3, len(co_list)) + 1)) if co_list else 0
                if k and co_list:
                    picks = rng.choice(co_list, size=k, replace=False)
                    selected.update(int(p) for p in picks)
                # random noise symptoms (false associations)
                noise_pool = [i for i in range(len(names)) if i not in selected]
                nk = int(rng.integers(0, min(n_noise, len(noise_pool)) + 1))
                if nk:
                    noisy = rng.choice(noise_pool, size=nk, replace=False)
                    # only keep noise 40% of the time fully; else skip to keep signal strong
                    if rng.random() < 0.35:
                        selected.update(int(p) for p in noisy)

                intensity = float(rng.uniform(0.3, 1.0))
                # severity drifts slightly with intensity
                sev = base_sev
                if intensity > 0.85 and sev == "Mild":
                    sev = "Moderate"
                if intensity > 0.95 and entry["severity"] in ("Severe", "Emergency"):
                    sev = entry["severity"]

                X_rows.append(vec(selected, gval, intensity))
                y_primary.append(primary_i)
                y_sev.append(sev)
                y_cat.append(base_cat)

            # single-symptom pure sample
            X_rows.append(vec({primary_i}, gval, 0.7))
            y_primary.append(primary_i)
            y_sev.append(base_sev)
            y_cat.append(base_cat)

    X = np.vstack(X_rows)
    y_primary = np.array(y_primary)
    y_sev = sev_le.transform(y_sev)
    y_cat = cat_le.transform(y_cat)

    meta = {
        "feature_names": names + ["intensity", "gender"],
        "symptom_names": names,
        "severity_classes": list(sev_le.classes_),
        "category_classes": list(cat_le.classes_),
        "kind": "symptom",
    }
    return X, y_primary, y_sev, y_cat, sev_le, cat_le, meta


def build_injury_training(catalog: list[dict]):
    names = [c["name"] for c in catalog]
    body_parts = sorted({c["body_part"] for c in catalog if c["body_part"]})
    bp_index = {b: i for i, b in enumerate(body_parts)}

    cat_le = LabelEncoder()
    sev_le = LabelEncoder()
    cat_le.fit([c["category"] for c in catalog])
    sev_le.fit(sorted({c["severity"] for c in catalog} | {"Mild", "Moderate", "Severe", "Emergency"}))

    rng = np.random.default_rng(7)
    X_rows, y_primary, y_sev, y_cat = [], [], [], []

    n_feat = len(names) + len(body_parts) + 2  # injuries multi-hot + body-part one-hot + intensity + gender

    def vec(inj_i: int, bp: str, gender: float, intensity: float) -> np.ndarray:
        v = np.zeros(n_feat, dtype=np.float32)
        v[inj_i] = 1.0
        # soft similarity: activate injuries sharing body part lightly
        for j, c in enumerate(catalog):
            if j != inj_i and bp and c["body_part"] == bp:
                v[j] = max(v[j], 0.25)
        if bp in bp_index:
            v[len(names) + bp_index[bp]] = 1.0
        v[-2] = intensity
        v[-1] = gender
        return v

    for i, entry in enumerate(catalog):
        for gender_name, gval in (("male", 0.0), ("female", 1.0), ("unknown", 0.5)):
            reps = 3
            if gender_name == "male" and entry["male_notes"]:
                reps = 4
            if gender_name == "female" and entry["female_notes"]:
                reps = 4
            for _ in range(reps):
                intensity = float(rng.uniform(0.35, 1.0))
                X_rows.append(vec(i, entry["body_part"], gval, intensity))
                y_primary.append(i)
                y_sev.append(entry["severity"])
                y_cat.append(entry["category"])

    X = np.vstack(X_rows)
    meta = {
        "feature_names": names + [f"bp::{b}" for b in body_parts] + ["intensity", "gender"],
        "injury_names": names,
        "body_parts": body_parts,
        "severity_classes": list(sev_le.classes_),
        "category_classes": list(cat_le.classes_),
        "kind": "injury",
    }
    return (
        X,
        np.array(y_primary),
        sev_le.transform(y_sev),
        cat_le.transform(y_cat),
        sev_le,
        cat_le,
        meta,
    )


def _train_bundle(X, y_primary, y_sev, y_cat, label: str):
    Xtr, Xte, yp_tr, yp_te, ys_tr, ys_te, yc_tr, yc_te = train_test_split(
        X, y_primary, y_sev, y_cat, test_size=0.2, random_state=42
    )
    common = dict(n_estimators=120, max_depth=12, random_state=42, n_jobs=-1, class_weight="balanced_subsample")
    m_primary = RandomForestClassifier(**common)
    m_sev = RandomForestClassifier(**common)
    m_cat = RandomForestClassifier(**common)
    m_primary.fit(Xtr, yp_tr)
    m_sev.fit(Xtr, ys_tr)
    m_cat.fit(Xtr, yc_tr)

    print(f"\n=== {label} ===")
    print(f"Primary accuracy:  {accuracy_score(yp_te, m_primary.predict(Xte)):.3f}")
    print(f"Severity accuracy: {accuracy_score(ys_te, m_sev.predict(Xte)):.3f}")
    print(f"Category accuracy: {accuracy_score(yc_te, m_cat.predict(Xte)):.3f}")
    print("Severity report:")
    print(classification_report(ys_te, m_sev.predict(Xte), zero_division=0))

    # refit on all data
    m_primary.fit(X, y_primary)
    m_sev.fit(X, y_sev)
    m_cat.fit(X, y_cat)
    return {"primary": m_primary, "severity": m_sev, "category": m_cat}


def train(xlsx_path: str | Path = DEFAULT_XLSX) -> None:
    xlsx_path = Path(xlsx_path)
    if not xlsx_path.exists():
        raise FileNotFoundError(xlsx_path)

    sym_raw = pd.read_excel(xlsx_path, sheet_name="Symptoms")
    inj_raw = pd.read_excel(xlsx_path, sheet_name="Injuries")
    sym_df = _clean_df_symptoms(sym_raw)
    inj_df = _clean_df_injuries(inj_raw)

    kb = build_kb(sym_df, inj_df)
    kb_path = ML_DIR / "gender_kb.json"
    kb_path.write_text(json.dumps(kb, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"KB saved -> {kb_path}  ({len(kb['symptoms'])} symptoms, {len(kb['injuries'])} injuries)")

    # Symptoms
    Xs, yp, ys, yc, sev_le_s, cat_le_s, meta_s = build_symptom_training(sym_df, kb["symptoms"])
    models_s = _train_bundle(Xs, yp, ys, yc, "SYMPTOMS")
    meta_s["severity_encoder"] = sev_le_s
    meta_s["category_encoder"] = cat_le_s
    joblib.dump(models_s, ML_DIR / "gender_symptom_model.joblib")
    joblib.dump(meta_s, ML_DIR / "gender_symptom_meta.joblib")
    print(f"Saved symptom model -> {ML_DIR / 'gender_symptom_model.joblib'}")

    # Injuries
    Xi, yp, ys, yc, sev_le_i, cat_le_i, meta_i = build_injury_training(kb["injuries"])
    models_i = _train_bundle(Xi, yp, ys, yc, "INJURIES")
    meta_i["severity_encoder"] = sev_le_i
    meta_i["category_encoder"] = cat_le_i
    joblib.dump(models_i, ML_DIR / "gender_injury_model.joblib")
    joblib.dump(meta_i, ML_DIR / "gender_injury_meta.joblib")
    print(f"Saved injury model -> {ML_DIR / 'gender_injury_model.joblib'}")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else str(DEFAULT_XLSX)
    train(path)
