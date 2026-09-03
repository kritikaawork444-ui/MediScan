"""
Offline results when Ollama is not running.

Uses the gender knowledge base (spreadsheet) + simple heuristics so every
feature still returns a useful JSON payload instead of a 503 error.
"""
from __future__ import annotations

import re
from typing import Iterable

from app.services import gender_predictor
from app.services.result_i18n import localize_symptom_result


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def _token_overlap(a: str, b: str) -> float:
    ta = set(_norm(a).split())
    tb = set(_norm(b).split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _match_symptom(query: str, catalog: list[dict]) -> dict | None:
    q = _norm(query)
    if not q:
        return None
    best, best_score = None, 0.0
    for s in catalog:
        name = _norm(s["name"])
        if q == name or q in name or name in q:
            return s
        score = _token_overlap(q, s["name"])
        # also match against co-occurs / causes lightly
        score = max(score, _token_overlap(q, " ".join(s.get("co_occurs") or [])) * 0.5)
        if score > best_score:
            best, best_score = s, score
    return best if best_score >= 0.3 else None


def _match_injury(query: str, catalog: list[dict]) -> dict | None:
    q = _norm(query)
    if not q:
        return None
    best, best_score = None, 0.0
    for s in catalog:
        name = _norm(s["name"])
        if q == name or q in name or name in q:
            return s
        score = max(
            _token_overlap(q, s["name"]),
            _token_overlap(q, s.get("body_part") or "") * 0.8,
            _token_overlap(q, s.get("category") or "") * 0.5,
        )
        if score > best_score:
            best, best_score = s, score
    return best if best_score >= 0.25 else None


def _sev_confidence(sev: str) -> float:
    return {
        "Emergency": 88.0,
        "Severe": 78.0,
        "Moderate": 68.0,
        "Mild": 60.0,
    }.get(sev or "Moderate", 65.0)


# ---------- Symptom checker (AI page) ----------

def analyze_symptoms_offline(
    symptoms: list[str],
    notes: str | None = None,
    pain_location: str | None = None,
    pain_description: str | None = None,
    language: str = "en",
) -> dict:
    catalog = []
    try:
        if gender_predictor.is_ready():
            # full entries from kb
            from app.services.gender_predictor import _load_kb

            catalog = _load_kb()["symptoms"]
    except Exception:
        catalog = []

    primary = []
    for raw in symptoms or []:
        hit = _match_symptom(raw, catalog) if catalog else None
        if hit and hit not in primary:
            primary.append(hit)

    # Keep user-selected order primarily; only break ties by severity
    order = {"Emergency": 0, "Severe": 1, "Moderate": 2, "Mild": 3}
    if len(primary) > 1:
        # stable-ish: severity as secondary key without wiping input order completely
        indexed = list(enumerate(primary))
        indexed.sort(key=lambda t: (order.get(t[1].get("severity") or "Moderate", 2), t[0]))
        primary = [t[1] for t in indexed]

    location_extra = []
    if pain_location and catalog:
        for s in catalog:
            if s in primary:
                continue
            if _token_overlap(pain_location, s["name"]) >= 0.5:
                location_extra.append(s)

    matched = primary + location_extra

    if not matched and catalog:
        for pref in ("Fever", "Headache", "Fatigue", "Cough"):
            hit = next((s for s in catalog if s["name"] == pref), None)
            if hit:
                matched.append(hit)
                break

    if not matched:
        condition = (symptoms or ["General discomfort"])[0]
        result = {
            "condition": condition,
            "confidence": 55,
            "possible_causes": [
                {
                    "condition": condition,
                    "confidence": 55,
                    "why": "Based on the symptoms you selected",
                },
                {
                    "condition": "Viral illness (common)",
                    "confidence": 30,
                    "why": "Many everyday symptoms overlap with mild viral illness",
                },
                {
                    "condition": "Stress / fatigue related",
                    "confidence": 15,
                    "why": "Common when sleep or stress is off",
                },
            ],
            "recommendations": [
                "Rest and drink plenty of water or warm fluids.",
                "Eat light food and avoid heavy / oily meals for a day.",
                "Track symptoms for 24–48 hours.",
                "See a doctor if it gets worse or new red-flag signs appear.",
            ],
            "treatment": [
                "Basic home care: rest, fluids, and sleep.",
                "Ask a pharmacist before any OTC fever/pain reliever.",
            ],
            "disclaimer": (
                "This is not a medical diagnosis (offline guide). "
                "Please consult a doctor for proper care."
            ),
        }
        return localize_symptom_result(result, language)

    causes = []
    confs = [72, 18, 10]
    for i, s in enumerate(matched[:3]):
        causes.append(
            {
                "condition": s["name"],
                "confidence": confs[i] if i < len(confs) else 10,
                "why": (s.get("likely_causes") or "Matches your selected symptoms")[:90],
            }
        )
    if len(causes) < 2 and matched:
        top = matched[0]
        for co in (top.get("co_occurs") or [])[:2]:
            if len(causes) >= 3:
                break
            causes.append(
                {
                    "condition": co,
                    "confidence": 15,
                    "why": f"Often seen together with {top['name']}",
                }
            )
    if len(causes) < 2:
        causes.append(
            {
                "condition": "Needs clinical review",
                "confidence": 15,
                "why": "See a doctor if unsure or worsening",
            }
        )

    top = matched[0]
    tips = []
    if top.get("self_care"):
        tips.append(top["self_care"])
    tips.extend(
        [
            "Rest, hydrate, and avoid strenuous activity today.",
            "If fever/pain medicine is needed, check dose with a pharmacist first.",
        ]
    )
    if notes:
        tips.append(f"You noted: “{notes[:120]}” — share this with a clinician if you visit one.")
    if pain_location or pain_description:
        tips.append(
            "Pain context: "
            + (pain_location or "unspecified location")
            + (f", {pain_description}" if pain_description else "")
            + "."
        )

    treatment = [top.get("self_care") or "Supportive home care."]
    if top.get("likely_causes"):
        treatment.append(f"Common causes to discuss with a doctor: {top['likely_causes']}")

    when = top.get("when_to_see_doctor") or "See a doctor if symptoms persist or worsen."
    red = top.get("red_flags") or ""
    if red:
        tips.append(f"Red flags — seek urgent care if: {red}")

    result = {
        "condition": top["name"],
        "confidence": _sev_confidence(top.get("severity")),
        "possible_causes": causes,
        "recommendations": tips[:6],
        "treatment": treatment,
        "disclaimer": (
            "This is not a medical diagnosis. Offline guide from the MediScan knowledge base — "
            "please consult a doctor for proper care."
        ),
    }
    return localize_symptom_result(result, language)


def generate_treatment_plan_offline(
    disease: str,
    symptom_scores: dict | None = None,
    confidence: float = 50,
    language: str = "en",
) -> dict:
    entry = None
    try:
        if gender_predictor.is_ready():
            from app.services.gender_predictor import _load_kb, _symptom_lookup

            entry = _symptom_lookup(disease)
            if not entry:
                # try disease name against catalog loosely
                for s in _load_kb()["symptoms"]:
                    if _token_overlap(disease, s["name"]) >= 0.4:
                        entry = s
                        break
    except Exception:
        entry = None

    scores_txt = ""
    if symptom_scores:
        scores_txt = ", ".join(f"{k}: {v}" for k, v in symptom_scores.items())

    if entry:
        recs = [entry.get("self_care") or "Rest and fluids."]
        if entry.get("male_notes") or entry.get("female_notes"):
            recs.append(
                "Gender-specific notes are available on the Gender Health ML page for more detail."
            )
        recs.append("Monitor symptoms and avoid self-medicating with prescription drugs.")
        treatment = [entry.get("self_care") or "Supportive care."]
        if entry.get("likely_causes"):
            treatment.append(f"Often linked to: {entry['likely_causes']}")
        return {
            "explanation": (
                f"The ML model flagged “{disease}” ({confidence}% confidence)"
                + (f" from readings {scores_txt}." if scores_txt else ".")
                + f" In the knowledge base this maps to {entry['name']} "
                f"({entry.get('category')}, {entry.get('severity')} severity)."
            ),
            "recommendations": recs,
            "treatment": treatment,
            "when_to_see_doctor": entry.get("when_to_see_doctor")
            or "See a doctor if symptoms worsen or last more than a few days.",
            "disclaimer": (
                "This is not a medical diagnosis. Offline advice from the knowledge base — "
                "confirm with a doctor."
            ),
        }

    return {
        "explanation": (
            f"The model predicts “{disease}” with {confidence}% confidence"
            + (f" based on {scores_txt}." if scores_txt else ".")
        ),
        "recommendations": [
            "Rest and drink plenty of fluids.",
            "Eat light meals and get adequate sleep.",
            "Track fever/pain and note any new symptoms.",
            "See a doctor if it does not improve in a few days.",
        ],
        "treatment": [
            "Basic home care: rest, hydration, and monitoring.",
            "Ask a pharmacist before taking any OTC medicine.",
        ],
        "when_to_see_doctor": (
            "Seek care promptly for high fever, breathing trouble, chest pain, "
            "confusion, severe dehydration, or symptoms lasting more than a few days."
        ),
        "disclaimer": (
            "This is not a medical diagnosis. Offline guide — please consult a doctor."
        ),
    }


def lookup_disease_offline(query: str, language: str = "en") -> dict:
    q = (query or "").strip()
    entry = None
    try:
        if gender_predictor.is_ready():
            from app.services.gender_predictor import _load_kb

            kb = _load_kb()
            entry = _match_symptom(q, kb["symptoms"])
            if not entry:
                inj = _match_injury(q, kb["injuries"])
                if inj:
                    return {
                        "name": inj["name"],
                        "category": inj.get("category") or "Injury",
                        "risk_level": inj.get("severity") or "Moderate",
                        "description": (
                            f"{inj['name']} affecting {inj.get('body_part') or 'the body'}. "
                            f"Common causes: {inj.get('common_causes') or 'various trauma'}."
                        ),
                        "symptoms": inj.get("common_causes") or "",
                        "causes": inj.get("common_causes") or "",
                        "treatment": [
                            inj.get("first_aid") or "Protect the area and rest.",
                            f"Typical recovery: {inj.get('recovery_time') or 'varies'}.",
                            inj.get("when_to_see_doctor") or "See a doctor if severe.",
                        ],
                        "disclaimer": (
                            "General offline information, not a diagnosis. "
                            "Consult a doctor for personal advice."
                        ),
                    }
    except Exception:
        entry = None

    if entry:
        treatment = []
        if entry.get("self_care"):
            treatment.append(entry["self_care"])
        if entry.get("when_to_see_doctor"):
            treatment.append(entry["when_to_see_doctor"])
        if entry.get("red_flags"):
            treatment.append(f"Emergency signs: {entry['red_flags']}")
        if not treatment:
            treatment = ["Rest, fluids, and medical advice if persistent."]
        return {
            "name": entry["name"],
            "category": entry.get("category") or "Common",
            "risk_level": entry.get("severity") or "Moderate",
            "description": (
                f"{entry['name']} — {entry.get('likely_causes') or 'See a clinician for details.'}"
            ),
            "symptoms": ", ".join(entry.get("co_occurs") or []) or entry["name"],
            "causes": entry.get("likely_causes") or "",
            "treatment": treatment,
            "disclaimer": (
                "General offline information from the MediScan knowledge base, "
                "not a medical diagnosis. Consult a doctor for personal advice."
            ),
        }

    # static encyclopedia leftovers + common tropical illnesses
    static = {
        "common cold": {
            "name": "Common Cold",
            "category": "Viral",
            "risk_level": "Low",
            "description": "A mild viral infection of the upper respiratory tract.",
            "symptoms": "Runny nose, sneezing, sore throat, cough",
            "causes": "Usually rhinovirus or similar respiratory viruses.",
            "treatment": [
                "Rest and fluids.",
                "Saline gargles / steam if helpful.",
                "OTC fever/pain reliever only after checking with a pharmacist.",
                "See a doctor if symptoms last >10 days or worsen suddenly.",
            ],
        },
        "flu": {
            "name": "Influenza (Flu)",
            "category": "Viral",
            "risk_level": "Moderate",
            "description": "A viral infection causing fever, chills, body ache and fatigue.",
            "symptoms": "Fever, chills, cough, headache, sore throat, body aches",
            "causes": "Influenza viruses, often seasonal.",
            "treatment": [
                "Rest and hydration.",
                "Isolate to reduce spread.",
                "Seek care if breathing is hard, or high risk (elderly, pregnancy, chronic illness).",
            ],
        },
        "influenza": {
            "name": "Influenza (Flu)",
            "category": "Viral",
            "risk_level": "Moderate",
            "description": "A viral infection causing fever, chills, body ache and fatigue.",
            "symptoms": "Fever, chills, cough, headache, sore throat, body aches",
            "causes": "Influenza viruses, often seasonal.",
            "treatment": [
                "Rest and hydration.",
                "Isolate to reduce spread.",
                "Seek care if breathing is hard or you are high risk.",
            ],
        },
        "migraine": {
            "name": "Migraine",
            "category": "Neurological",
            "risk_level": "Moderate",
            "description": "A neurological condition causing severe headaches, often with nausea or light sensitivity.",
            "symptoms": "Severe headache, nausea, light sensitivity",
            "causes": "Triggers include stress, hormones, sleep change, certain foods.",
            "treatment": [
                "Rest in a dark quiet room.",
                "Hydrate; cold pack on forehead/neck.",
                "Discuss preventive options with a doctor if frequent.",
            ],
        },
        "dengue": {
            "name": "Dengue",
            "category": "Viral",
            "risk_level": "High",
            "description": "A mosquito-borne viral illness that can cause high fever, severe body aches, headache, and sometimes bleeding warning signs.",
            "symptoms": "High fever, severe body pain, headache behind eyes, rash, fatigue, nausea",
            "causes": "Dengue virus spread by Aedes mosquitoes.",
            "treatment": [
                "Rest and drink plenty of fluids (ORS if needed).",
                "Use paracetamol for fever only after pharmacist/doctor advice — avoid ibuprofen/aspirin unless a doctor says so.",
                "Watch for warning signs: severe belly pain, persistent vomiting, bleeding, black stools, drowsiness, cold clammy skin.",
                "Seek medical care promptly — blood tests may be needed; do not wait if warning signs appear.",
            ],
        },
        "malaria": {
            "name": "Malaria",
            "category": "Parasitic",
            "risk_level": "High",
            "description": "A mosquito-borne parasitic infection causing fever cycles, chills, sweating, headache and fatigue.",
            "symptoms": "Fever, chills, sweating, headache, body ache, fatigue, nausea",
            "causes": "Plasmodium parasites transmitted by Anopheles mosquitoes.",
            "treatment": [
                "This needs medical testing (blood smear / RDT) — see a doctor urgently.",
                "Rest and fluids while arranging care.",
                "Do not self-treat with leftover antibiotics or unknown tablets.",
                "Emergency care if confusion, seizures, breathing trouble, or very high fever.",
            ],
        },
        "asthma": {
            "name": "Asthma",
            "category": "Respiratory",
            "risk_level": "Moderate",
            "description": "A condition where airways narrow and inflame, causing wheeze, cough, and breathlessness.",
            "symptoms": "Wheeze, shortness of breath, chest tightness, cough (often night/early morning)",
            "causes": "Airway inflammation triggered by allergens, smoke, exercise, infections, cold air.",
            "treatment": [
                "Use prescribed inhalers as directed by your doctor.",
                "Sit upright, stay calm, move away from smoke/dust triggers.",
                "Seek emergency care for severe breathlessness, blue lips, or no relief from reliever inhaler.",
            ],
        },
        "typhoid": {
            "name": "Typhoid fever",
            "category": "Bacterial",
            "risk_level": "High",
            "description": "A bacterial infection (Salmonella typhi) causing prolonged fever, weakness, stomach pain, and headache.",
            "symptoms": "Prolonged fever, headache, abdominal pain, weakness, sometimes rash or constipation/diarrhea",
            "causes": "Contaminated food or water.",
            "treatment": [
                "Needs doctor-prescribed antibiotics after testing — do not self-medicate.",
                "Hydration and rest; safe drinking water and hygiene.",
                "Seek care urgently if very high fever, confusion, or severe abdominal pain.",
            ],
        },
    }
    key = _norm(q)
    for k, v in static.items():
        if k in key or key in k:
            return {
                **v,
                "disclaimer": "General offline information, not a medical diagnosis.",
            }

    return {
        "name": q or "Unknown",
        "category": "Common",
        "risk_level": "Moderate",
        "description": (
            f"No detailed offline entry for “{q}”. "
            "Try a common symptom name (e.g. Fever, Migraine, Ankle sprain) "
            "or ask a clinician."
        ),
        "symptoms": "",
        "causes": "",
        "treatment": [
            "Use the Gender Health ML or Symptom Checker with specific symptoms.",
            "See a doctor for personal medical advice.",
        ],
        "disclaimer": "General offline information, not a medical diagnosis.",
    }


# ---------- Report scanner ----------

_LAB_PATTERNS = [
    # name, regex for value, unit hint, low, high (approx adult ref — illustrative only)
    ("Hemoglobin", r"(?:hemoglobin|hb|hgb)\s*[:=]?\s*(\d+(?:\.\d+)?)", "g/dL", 12.0, 17.5),
    ("WBC", r"(?:wbc|white blood(?: cell)?s?|leucocyte[s]?)\s*[:=]?\s*(\d+(?:\.\d+)?)", "×10³/µL", 4.0, 11.0),
    ("Platelets", r"(?:platelet[s]?|plt)\s*[:=]?\s*(\d+(?:\.\d+)?)", "×10³/µL", 150, 450),
    ("RBC", r"(?:rbc|red blood(?: cell)?s?)\s*[:=]?\s*(\d+(?:\.\d+)?)", "×10⁶/µL", 4.0, 6.0),
    ("Glucose", r"(?:glucose|blood sugar|fbs|rbs|fbg)\s*[:=]?\s*(\d+(?:\.\d+)?)", "mg/dL", 70, 140),
    ("Creatinine", r"(?:creatinine|creat\.?)\s*[:=]?\s*(\d+(?:\.\d+)?)", "mg/dL", 0.6, 1.3),
    ("Urea", r"(?:urea|bun)\s*[:=]?\s*(\d+(?:\.\d+)?)", "mg/dL", 7, 45),
    ("Cholesterol", r"(?:total\s*)?cholesterol\s*[:=]?\s*(\d+(?:\.\d+)?)", "mg/dL", 0, 200),
    ("HDL", r"hdl\s*[:=]?\s*(\d+(?:\.\d+)?)", "mg/dL", 40, 999),
    ("LDL", r"ldl\s*[:=]?\s*(\d+(?:\.\d+)?)", "mg/dL", 0, 100),
    ("Triglycerides", r"(?:triglyceride[s]?|tg)\s*[:=]?\s*(\d+(?:\.\d+)?)", "mg/dL", 0, 150),
    ("TSH", r"tsh\s*[:=]?\s*(\d+(?:\.\d+)?)", "mIU/L", 0.4, 4.5),
    ("Vitamin D", r"(?:vitamin\s*d|25[\s\-]?oh)\s*[:=]?\s*(\d+(?:\.\d+)?)", "ng/mL", 30, 100),
    ("Vitamin B12", r"(?:vitamin\s*b12|b12)\s*[:=]?\s*(\d+(?:\.\d+)?)", "pg/mL", 200, 900),
    ("Iron", r"(?:serum\s*)?iron\s*[:=]?\s*(\d+(?:\.\d+)?)", "µg/dL", 60, 170),
    ("ALT", r"(?:alt|sgpt)\s*[:=]?\s*(\d+(?:\.\d+)?)", "U/L", 0, 55),
    ("AST", r"(?:ast|sgot)\s*[:=]?\s*(\d+(?:\.\d+)?)", "U/L", 0, 48),
]


def analyze_report_text_offline(report_text: str, filename: str = "", language: str = "en") -> dict:
    text = report_text or ""
    lower = text.lower()
    metrics = []
    seen = set()
    for name, pattern, unit, low, high in _LAB_PATTERNS:
        m = re.search(pattern, lower, flags=re.I)
        if not m:
            continue
        if name in seen:
            continue
        seen.add(name)
        try:
            val = float(m.group(1))
        except ValueError:
            continue
        if val < low:
            status = "Low"
        elif val > high:
            status = "High"
        else:
            status = "Normal"
        metrics.append({"name": name, "value": f"{val} {unit}".strip(), "status": status})

    # generic number grab if nothing matched
    if not metrics:
        # pull lines that look like "Label 12.3"
        for line in text.splitlines():
            m = re.search(r"([A-Za-z][A-Za-z\s\-]{2,30}?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*([a-zA-Z/%µu³^0-9\.]*)", line)
            if not m:
                continue
            label = m.group(1).strip()
            if len(label) < 3:
                continue
            if label.lower() in seen or label in seen:
                continue
            seen.add(label.lower())
            metrics.append(
                {
                    "name": label.title()[:40],
                    "value": f"{m.group(2)} {m.group(3)}".strip(),
                    "status": "Normal",
                }
            )
            if len(metrics) >= 8:
                break

    abnormal = [m for m in metrics if m["status"] != "Normal"]
    if metrics and not abnormal:
        findings = (
            f"Read {len(metrics)} value(s) from “{filename or 'report'}”. "
            "Parsed values look within common adult reference ranges (rough guide only)."
        )
        confidence = 72
        recs = [
            "Keep a copy of this report for your doctor.",
            "Reference ranges vary by lab, age, and sex — confirm with your clinician.",
            "Maintain hydration, balanced diet, and regular sleep.",
        ]
    elif abnormal:
        names = ", ".join(m["name"] for m in abnormal[:5])
        findings = (
            f"Found {len(metrics)} value(s); flagged: {names}. "
            "These are approximate flags only — not a diagnosis."
        )
        confidence = 68
        recs = [
            f"Discuss flagged results ({names}) with your doctor.",
            "Do not start or stop medicines based only on this offline scan.",
            "Repeat test if your clinician advises, ideally at the same lab.",
            "Note symptoms (fatigue, dizziness, weight change) to share at the visit.",
        ]
    else:
        findings = (
            "Could not detect standard lab labels in the text. "
            "Try a clearer PDF/export, or type key values into notes for your doctor."
        )
        confidence = 35
        recs = [
            "Upload a text-based PDF if possible (not only a photo).",
            "Ensure the scan shows test names and numbers clearly.",
            "Ask the lab for a digital report.",
        ]

    return {
        "metrics": metrics,
        "findings": findings,
        "confidence": confidence,
        "recommendations": recs,
        "disclaimer": (
            "Offline parse — not a medical diagnosis. Lab ranges differ; "
            "always interpret reports with a qualified clinician."
        ),
    }


# ---------- Injury photo (no vision model) ----------

def analyze_injury_image_offline(
    image_bytes: bytes | None = None,
    media_type: str | None = None,
    language: str = "en",
    hint: str | None = None,
) -> dict:
    """Without a vision model we can't see the photo — return safe first-aid triage."""
    # Try to use a generic moderate wound entry from KB
    entry = None
    try:
        if gender_predictor.injury_ready():
            from app.services.gender_predictor import _load_kb

            injuries = _load_kb()["injuries"]
            for name in (
                hint or "",
                "Cut/Laceration",
                "Abrasion (Scrape)",
                "Bruise (Contusion)",
                "Burn (First-degree)",
            ):
                if not name:
                    continue
                entry = _match_injury(name, injuries)
                if entry:
                    break
    except Exception:
        entry = None

    if entry:
        return {
            "injury_type": entry["name"],
            "severity": entry.get("severity") or "Moderate",
            "confidence": 45,
            "treatment_suggestions": [
                entry.get("first_aid") or "Clean gently, protect the area, rest.",
                f"Typical recovery: {entry.get('recovery_time') or 'varies'}.",
                entry.get("when_to_see_doctor") or "See a doctor if it worsens.",
                "Photo was reviewed offline without a vision model — treat this as general first aid only.",
            ],
            "disclaimer": (
                "Offline mode cannot see the photo. This is general first-aid guidance, "
                "not a diagnosis. Seek urgent care for heavy bleeding, deformity, "
                "head/spine injury, or signs of infection."
            ),
        }

    return {
        "injury_type": "Possible soft-tissue injury (offline estimate)",
        "severity": "Moderate",
        "confidence": 40,
        "treatment_suggestions": [
            "If bleeding: apply firm pressure with a clean cloth for 10 minutes.",
            "Clean with clean water; cover with a sterile bandage.",
            "RICE for sprains: Rest, Ice (wrapped, 15–20 min), Compression, Elevation.",
            "Do not push bones back or remove deep objects — get medical help.",
            "Seek ER care for heavy bleeding, numbness, deformity, head injury, or breathing trouble.",
        ],
        "disclaimer": (
            "Offline mode cannot analyze the photo visually. "
            "This is general first aid only — not a medical diagnosis."
        ),
    }
