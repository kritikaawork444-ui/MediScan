"""
ML Injury Analyzer v2:
1) Binary is_injury gate (rejects fake/unrelated photos)
2) Multiclass injury family on accepted photos
3) Severity + first-aid tips from knowledge base
"""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from PIL import Image

_ML_DIR = Path(__file__).parent.parent / "ml"
_MODEL_PATH = _ML_DIR / "injury_ml_model.joblib"
_META_PATH = _ML_DIR / "injury_ml_meta.joblib"

_bundle = None
_meta = None

NOT_INJURY_DEFAULT = "Not an injury (unrelated photo)"


def is_ready() -> bool:
    return _MODEL_PATH.exists() and _META_PATH.exists()


def _load():
    global _bundle, _meta
    if _bundle is None:
        if not is_ready():
            raise FileNotFoundError(
                "Injury ML model missing. Run: python -m app.ml.train_injury_report_models"
            )
        _bundle = joblib.load(_MODEL_PATH)
        _meta = joblib.load(_META_PATH)
    return _bundle, _meta


def reload_models() -> None:
    global _bundle, _meta
    _bundle = None
    _meta = None
    _load()


def extract_features(image_bytes: bytes) -> np.ndarray:
    """16-D visual feature vector — must match training extract_features_from_image."""
    img = Image.open(__import__("io").BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((256, 256))
    arr = np.asarray(img, dtype=np.float32)
    if arr.size == 0:
        return np.zeros(16, dtype=np.float32)

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    mean_r, mean_g, mean_b = float(r.mean()), float(g.mean()), float(b.mean())
    std_r, std_g, std_b = float(r.std()), float(g.std()), float(b.std())

    total = r + g + b + 1e-6
    red_ratio = float((r / total).mean())
    dark_ratio = float(((r + g + b) / 3.0 < 60).mean())
    bright_ratio = float(((r + g + b) / 3.0 > 200).mean())
    rg_diff = (mean_r - mean_g) / 255.0
    rb_diff = (mean_r - mean_b) / 255.0

    gray = 0.299 * r + 0.587 * g + 0.114 * b
    gy, gx = np.gradient(gray)
    edge = np.sqrt(gx * gx + gy * gy)
    edge_density = float(np.clip((edge > 18).mean(), 0, 1))
    contrast = float(np.clip((std_r + std_g + std_b) / 200.0, 0, 1.5))
    warmth = float(np.clip((mean_r - mean_b) / 255.0, -1, 1))

    purple_mask = (b > g * 1.05) & (b > 40) & (r < 180)
    purple_score = float(purple_mask.mean())
    yellow_mask = (r > 150) & (g > 130) & (b < 110)
    yellow_score = float(yellow_mask.mean())

    return np.array(
        [
            mean_r / 255.0,
            mean_g / 255.0,
            mean_b / 255.0,
            std_r / 80.0,
            std_g / 80.0,
            std_b / 80.0,
            red_ratio,
            dark_ratio,
            bright_ratio,
            rg_diff,
            rb_diff,
            edge_density,
            contrast,
            warmth,
            purple_score,
            yellow_score,
        ],
        dtype=np.float32,
    )


def _not_injury_result(confidence: float, reason: str) -> dict:
    conf = round(float(confidence) * 100.0, 1) if confidence <= 1.5 else round(float(confidence), 1)
    conf = float(np.clip(conf, 50.0, 99.0))
    return {
        "injury_type": NOT_INJURY_DEFAULT,
        "severity": "Low",
        "severity_raw": "Mild",
        "confidence": conf,
        "category": "Non-injury",
        "body_part": "",
        "is_injury": False,
        "probabilities": [],
        "treatment_suggestions": [
            "Yeh photo injury jaisi nahi lagti (wound / bruise / burn / swollen joint close-up nahi dikh raha).",
            "Injured area ka clear, well-lit close-up upload karo — frame ka zyada hissa wound ho.",
            "Selfie, wallpaper, food, screenshot, meme mat bhejo.",
            "Agar abhi serious injury hai to app ka wait mat karo — first aid / doctor / ER.",
        ],
        "source": "injury_ml",
        "reject_reason": reason,
        "disclaimer": (
            "ML filter: unrelated or low-signal photo — not an injury diagnosis. "
            "For real injuries, re-upload a clear photo or see a clinician."
        ),
    }


def _advice_for(family: str, severity: str, meta: dict) -> list[str]:
    tips: list[str] = []
    fkb = (meta.get("family_kb") or {}).get(family) or {}
    kb = meta.get("kb") or {}

    # family row first, else any original name mapped to this family
    entry = fkb
    if not entry.get("first_aid"):
        fmap = meta.get("family_map") or {}
        for name, fam in fmap.items():
            if fam == family and name in kb:
                entry = kb[name]
                break

    if entry.get("first_aid"):
        tips.append(str(entry["first_aid"]))
    if entry.get("recovery_time"):
        tips.append(f"Typical recovery: {entry['recovery_time']}")
    if entry.get("when_to_see_doctor"):
        tips.append(str(entry["when_to_see_doctor"]))
    if entry.get("red_flags"):
        tips.append(f"Red flags: {entry['red_flags']}")

    # try gender KB too
    try:
        from app.services import gender_predictor

        if gender_predictor.injury_ready():
            from app.services.gender_predictor import _injury_lookup, _load_kb

            # search by family keyword
            hit = _injury_lookup(family)
            if not hit:
                for inj in _load_kb().get("injuries") or []:
                    n = (inj.get("name") or "").lower()
                    if family.split()[0].lower() in n or any(
                        k in n for k in family.lower().replace("/", " ").split() if len(k) > 3
                    ):
                        hit = inj
                        break
            if hit:
                if hit.get("first_aid") and hit["first_aid"] not in tips:
                    tips.insert(0, hit["first_aid"])
                if hit.get("when_to_see_doctor"):
                    tips.append(hit["when_to_see_doctor"])
                if hit.get("red_flags"):
                    tips.append(f"Red flags: {hit['red_flags']}")
    except Exception:
        pass

    if not tips:
        tips = [
            "Protect the area, rest, and avoid further trauma.",
            "Clean visible wounds with clean water; cover with a sterile bandage.",
            "Cold pack (wrapped) 15–20 min for swelling if skin is intact.",
            "Seek urgent care for heavy bleeding, deformity, numbness, or head/spine injury.",
        ]
    if severity in ("Severe", "Emergency", "High"):
        tips.insert(0, "Severity looks high — prefer in-person medical evaluation soon.")
    # dedupe preserve order
    out, seen = [], set()
    for t in tips:
        t = str(t).strip()
        if t and t not in seen:
            seen.add(t)
            out.append(t)
    return out[:6]


def _heuristic_family(feats: np.ndarray) -> tuple[str | None, float]:
    """Color prior when model is unsure — returns (family, strength)."""
    (
        mean_r, mean_g, mean_b,
        _sr, _sg, _sb,
        red_ratio, dark_ratio, bright_ratio,
        rg_diff, rb_diff,
        edge_density, contrast,
        warmth, purple_score, yellow_score,
    ) = feats.tolist()

    scores = {
        "Bruise (Contusion)": 0.0,
        "Burn": 0.0,
        "Cut/Laceration": 0.0,
        "Abrasion (Scrape)": 0.0,
        "Sprain / Strain": 0.0,
    }
    if purple_score > 0.05:
        scores["Bruise (Contusion)"] += 0.5 + purple_score
    if mean_b > mean_r and mean_b > mean_g and purple_score > 0.02:
        scores["Bruise (Contusion)"] += 0.25
    if yellow_score > 0.04 and warmth > 0.12:
        scores["Burn"] += 0.45 + yellow_score
    if warmth > 0.22 and mean_r > 0.55 and yellow_score > 0.02:
        scores["Burn"] += 0.3
    if red_ratio > 0.4 and warmth > 0.1 and edge_density > 0.08:
        scores["Cut/Laceration"] += 0.4 + red_ratio * 0.3
    if red_ratio > 0.38 and edge_density > 0.2:
        scores["Abrasion (Scrape)"] += 0.25
    if warmth > 0.12 and 0.28 < red_ratio < 0.45 and purple_score < 0.08 and edge_density < 0.2:
        scores["Sprain / Strain"] += 0.2

    best = max(scores, key=scores.get)
    return (best, scores[best]) if scores[best] >= 0.25 else (None, 0.0)


def predict_from_image(image_bytes: bytes) -> dict:
    bundle, meta = _load()
    feats = extract_features(image_bytes)
    X = feats.reshape(1, -1)

    not_label = meta.get("not_injury_label") or NOT_INJURY_DEFAULT
    min_injury_proba = float(meta.get("min_injury_proba") or 0.48)

    # ---- v2 path: binary gate ----
    if bundle.get("version") == "injury_v2_render_binary" or "binary_model" in bundle:
        bin_model = bundle["binary_model"]
        type_model = bundle["type_model"]
        sev_model = bundle["severity_model"]
        type_le = bundle["type_encoder"]
        sev_le = bundle["severity_encoder"]

        if hasattr(bin_model, "predict_proba"):
            proba = bin_model.predict_proba(X)[0]
            # classes_ may be [0,1]
            classes = list(bin_model.classes_)
            if 1 in classes:
                p_inj = float(proba[classes.index(1)])
            else:
                p_inj = float(proba[-1])
        else:
            p_inj = float(bin_model.predict(X)[0])

        # Strong bruise/cut visual override when binary is borderline
        (
            _mr, _mg, _mb, _sr, _sg, _sb, red_ratio, _dr, _br, _rg, _rb,
            edge_density, _ct, warmth, purple_score, yellow_score,
        ) = feats.tolist()
        strong_bruise = purple_score >= 0.06
        strong_cut = red_ratio >= 0.42 and edge_density >= 0.1 and warmth > 0.08
        strong_burn = yellow_score >= 0.06 and warmth > 0.15 and mean_r > 0.5 if (mean_r := _mr) else False

        if p_inj < min_injury_proba:
            if p_inj >= 0.35 and (strong_bruise or strong_cut or strong_burn):
                p_inj = max(p_inj, 0.55)  # allow through
            else:
                return _not_injury_result(1.0 - p_inj, f"binary_gate p_inj={p_inj:.2f}")

        # Type among injury families
        type_probs = type_model.predict_proba(X)[0]
        type_classes_idx = type_model.classes_
        ranked = sorted(
            [
                (int(c), float(p), str(type_le.inverse_transform([int(c)])[0]))
                for c, p in zip(type_classes_idx, type_probs)
            ],
            key=lambda t: t[1],
            reverse=True,
        )
        # drop not-injury if present in encoder
        ranked = [t for t in ranked if t[2] != not_label and not t[2].startswith("Not an injury")]
        if not ranked:
            return _not_injury_result(0.7, "no_injury_class")

        top_idx, top_p, injury_type = ranked[0]

        # Heuristic only helps when model is uncertain AND cue is strong & matching
        heur_fam, heur_s = _heuristic_family(feats)
        if heur_fam and top_p < 0.42 and heur_s >= 0.45:
            # only override if heuristic family is not already near-top
            top_names = {n for _, _, n in ranked[:3]}
            if heur_fam not in top_names or ranked[0][2] != heur_fam:
                # require bruise purple / burn yellow / cut red to match family
                (
                    _mr, _mg, _mb, _sr, _sg, _sb, red_ratio, _dr, _br, _rg, _rb,
                    edge_density, _ct, warmth, purple_score, yellow_score,
                ) = feats.tolist()
                ok = False
                if heur_fam == "Bruise (Contusion)" and purple_score >= 0.04:
                    ok = True
                elif heur_fam == "Burn" and yellow_score >= 0.05 and warmth > 0.15:
                    ok = True
                elif heur_fam == "Cut/Laceration" and red_ratio >= 0.4 and edge_density >= 0.1:
                    ok = True
                if ok:
                    injury_type = heur_fam
                    top_p = max(top_p, min(0.8, 0.35 + heur_s * 0.35))

        sev_pred = int(sev_model.predict(X)[0])
        severity = str(sev_le.inverse_transform([sev_pred])[0])
        fkb = (meta.get("family_kb") or {}).get(injury_type) or {}
        if fkb.get("severity"):
            # keep model sev mostly; bump if family says emergency
            if fkb["severity"] == "Emergency" and severity in ("Mild", "Moderate"):
                severity = "Severe"

        ui_severity = {
            "Mild": "Low",
            "Moderate": "Moderate",
            "Severe": "High",
            "Emergency": "High",
        }.get(severity, severity)

        probabilities = [
            {"injury_type": name, "confidence": round(p * 100, 1)}
            for _, p, name in ranked[:5]
        ]

        # Display confidence: combine binary + type
        confidence = round(float(p_inj * 0.45 + top_p * 0.55) * 100, 1)
        confidence = float(np.clip(max(confidence, 40.0), 40.0, 95.0))

        tips = _advice_for(injury_type, severity, meta)

        return {
            "injury_type": injury_type,
            "severity": ui_severity,
            "severity_raw": severity,
            "confidence": confidence,
            "category": fkb.get("category") or "Injury",
            "body_part": fkb.get("body_part") or "",
            "is_injury": True,
            "probabilities": probabilities,
            "treatment_suggestions": tips,
            "source": "injury_ml",
            "injury_proba": round(p_inj, 3),
            "disclaimer": (
                "ML image estimate from color/texture features — not a medical diagnosis. "
                "Seek emergency care for heavy bleeding, deformity, head/spine injury, "
                "or signs of infection."
            ),
        }

    # ---- legacy v1 fallback ----
    type_model = bundle["type_model"]
    sev_model = bundle["severity_model"]
    type_le = bundle["type_encoder"]
    sev_le = bundle["severity_encoder"]
    type_probs = type_model.predict_proba(X)[0]
    ranked = sorted(
        [
            (int(c), float(p), str(type_le.inverse_transform([int(c)])[0]))
            for c, p in zip(type_model.classes_, type_probs)
        ],
        key=lambda t: t[1],
        reverse=True,
    )
    top_idx, top_p, injury_type = ranked[0]
    if injury_type == not_label or injury_type.startswith("Not an injury"):
        return _not_injury_result(top_p, "legacy_not_injury")
    if top_p < 0.2:
        return _not_injury_result(0.65, "legacy_low_conf")

    sev_pred = int(sev_model.predict(X)[0])
    severity = str(sev_le.inverse_transform([sev_pred])[0])
    ui_severity = {"Mild": "Low", "Moderate": "Moderate", "Severe": "High", "Emergency": "High"}.get(
        severity, severity
    )
    return {
        "injury_type": injury_type,
        "severity": ui_severity,
        "severity_raw": severity,
        "confidence": round(top_p * 100, 1),
        "is_injury": True,
        "probabilities": [
            {"injury_type": n, "confidence": round(p * 100, 1)} for _, p, n in ranked[:5]
        ],
        "treatment_suggestions": _advice_for(injury_type, severity, meta),
        "source": "injury_ml",
        "disclaimer": (
            "ML image estimate from color/texture features — not a medical diagnosis. "
            "Seek emergency care for heavy bleeding, deformity, head/spine injury, "
            "or signs of infection."
        ),
    }
