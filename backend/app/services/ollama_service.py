"""
This module is the only place in the backend that talks to a local Ollama
server (https://ollama.com). It now powers ALL AI features in the app -
Symptom Checker, Encyclopedia "Ask AI" lookup, Report Scanner, and Injury
Analyzer - so no data ever leaves the machine and no Claude API key is
needed.

Ollama must be running locally first:
    ollama serve
    ollama pull llama3.1        # text model, used by symptoms/report/encyclopedia
    ollama pull llava           # vision model, used by the injury analyzer

We ask the model to answer in strict JSON (using Ollama's `format: "json"`
mode) so the backend can parse it reliably.
"""
import base64
import json
import re

import httpx

from app.config import settings

_TIMEOUT = httpx.Timeout(120.0, connect=10.0)

# Supported response languages for every AI feature. "hi" uses proper Hindi
# (Devanagari) script; "hinglish" is the casual Hindi-in-English-letters
# style that's common in everyday chat - both are handled by the same local
# model, we just tell it which one to reply in.
LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (Devanagari script, हिन्दी)",
    "hinglish": "Hinglish (Hindi spoken casually but written in Roman/English letters, like normal everyday texting - not Devanagari script)",
}


def _language_instruction(language: str) -> str:
    name = LANGUAGE_NAMES.get(language, LANGUAGE_NAMES["en"])
    if language == "en":
        return ""
    return (
        f"\n\nIMPORTANT: Write every text value in the JSON (names, descriptions, "
        f"tips, disclaimer, etc.) in {name}. Keep the JSON keys themselves in "
        f"English exactly as shown in the shape below, and keep any numbers "
        f"in normal digits - only translate the natural-language text."
    )


def _extract_json(text: str) -> dict:
    """Local models sometimes wrap JSON in ```json fences or add stray text
    around it despite instructions - strip that before parsing."""
    cleaned = text.strip()
    cleaned = re.sub(r"^```(json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    # If the model still added preamble/postamble text, grab the outermost
    # {...} block as a fallback so a stray sentence never breaks the app.
    if not cleaned.startswith("{"):
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            cleaned = match.group(0)
    return json.loads(cleaned)


def _fallback_result(condition: str) -> dict:
    """Used only if the model's output truly can't be parsed as JSON, so the
    user still gets a usable (if generic) response instead of a 500 error."""
    return {
        "condition": condition,
        "confidence": 40,
        "recommendations": [
            "Rest and drink plenty of water or warm fluids.",
            "Eat light, simple food and try to sleep well.",
            "If needed, a common OTC medicine (like a fever/pain reliever) can help - check with a pharmacist for the right one and dose.",
            "See a doctor if it doesn't get better in a few days or gets worse.",
        ],
        "treatment": [
            "Basic home care: rest, fluids, and keeping an eye on how you feel.",
        ],
        "disclaimer": "This is not a medical diagnosis. Please consult a doctor for proper care.",
    }


def check_ollama_available() -> bool:
    """Quick health check so the API can return a clear error instead of a
    generic connection-refused message when Ollama isn't running."""
    try:
        r = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3.0)
        return r.status_code == 200
    except httpx.HTTPError:
        return False


def analyze_symptoms(
    symptoms: list[str],
    notes: str | None,
    pain_location: str | None = None,
    pain_description: str | None = None,
    language: str = "en",
) -> dict:
    """Send symptoms to a local Ollama model and get back 2-3 differential
    possible causes (ranked by likelihood) + confidence + treatment/solutions,
    as structured JSON."""
    symptom_text = ", ".join(symptoms)
    prompt = f"""You are a medical triage assistant inside a health app called MediScan.
A user selected these symptoms: {symptom_text}.
Where it hurts (body location): {pain_location or "not specified"}.
What the pain/discomfort feels like (e.g. sharp, dull, burning, throbbing, tight): {pain_description or "not specified"}.
Additional notes from the user: {notes or "none"}.

Use the location and quality of pain as important clues - the same symptom in a different body part or with a different quality of pain often points to a different condition. Weigh them accordingly.

Give a DIFFERENTIAL: the "possible_causes" array MUST contain AT LEAST 2 distinct possible causes, ideally 3 - never just 1, even if you are very confident, because showing alternatives is the whole point of this feature. Only omit the third if you truly cannot think of a plausible third cause. Confidences should roughly add up to 100 and reflect how likely each one is versus the others. These should be the most COMMON, everyday causes for this combination of symptoms (the things a doctor would think of first) - not rare or exotic conditions.

IMPORTANT rules for "recommendations" and "treatment":
- Give a mix of BASIC everyday self-care advice (resting, drinking more water, warm/cold compress, light food, sleeping properly, steam inhalation, gargling with warm salt water, staying in a cool/ventilated room, avoiding screen time, etc.) AND, where appropriate, a common over-the-counter medicine CATEGORY that people generally use for this (e.g. "a fever/pain reliever such as paracetamol", "an antacid for acidity", "an antihistamine for allergy symptoms", "ORS for dehydration"). Only mention generic categories/common generic names - NEVER a specific dose/mg, brand name, or prescription-only drug, and never suggest medicine for anything that could be serious (chest pain, difficulty breathing, high fever in infants, severe injury, etc.) - for those, recommend seeing a doctor instead.
- Write like you're talking to a normal person, not a doctor - plain, simple, everyday words, no medical jargon or technical terms.
- Every medicine-related tip must end with a short reminder to check with a pharmacist or doctor first (for correct dose and if it's safe for them, e.g. allergies, pregnancy, other medicines/conditions).

Respond with ONLY a JSON object (no markdown, no preamble, no explanation outside the JSON) in exactly this shape, keeping every string SHORT and to the point (this must be fast to generate):
{{
  "possible_causes": [
    {{"condition": "most likely condition name", "confidence": <number 0-100>, "why": "simple, plain-language reason this is a common cause, under 12 words"}},
    {{"condition": "second distinct possible condition", "confidence": <number 0-100>, "why": "simple, plain-language reason this is a common cause, under 12 words"}},
    {{"condition": "third possible condition if plausible", "confidence": <number 0-100>, "why": "simple, plain-language reason this is a common cause, under 12 words"}}
  ],
  "recommendations": ["basic self-care tip in simple words", "a common OTC medicine category if appropriate, with a check-with-pharmacist reminder"],
  "treatment": ["basic home-care step in simple words", "a common OTC medicine category if appropriate, with a check-with-pharmacist reminder"],
  "disclaimer": "one short sentence reminding the user this is not a medical diagnosis and to see a doctor if symptoms persist or worsen"
}}"""
    prompt += _language_instruction(language)

    def _call_ollama(user_prompt: str, temperature: float) -> str:
        try:
            resp = httpx.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": settings.ollama_model,
                    "messages": [{"role": "user", "content": user_prompt}],
                    "stream": False,
                    "format": "json",
                    # keep_alive keeps the model loaded in memory between requests
                    # so back-to-back symptom checks don't pay a reload penalty;
                    # num_predict caps output length so generation stays fast
                    # while still leaving room for 2-3 causes + tips.
                    "keep_alive": "30m",
                    "options": {"temperature": temperature, "num_predict": 650, "num_ctx": 2048},
                },
                timeout=_TIMEOUT,
            )
            resp.raise_for_status()
        except httpx.ConnectError as exc:
            raise ConnectionError(
                f"Can't reach Ollama at {settings.ollama_base_url}. "
                f"Make sure it's running (`ollama serve`) and the model "
                f"`{settings.ollama_model}` is pulled (`ollama pull {settings.ollama_model}`)."
            ) from exc
        return resp.json().get("message", {}).get("content", "")

    raw_text = _call_ollama(prompt, temperature=0.4)
    try:
        result = _extract_json(raw_text)
    except (json.JSONDecodeError, AttributeError):
        result = _fallback_result(raw_text[:80] or "Unable to determine")

    causes = result.get("possible_causes") or []

    # If the model ignored the "at least 2" instruction (small local models
    # sometimes do), retry once with a stronger nudge instead of silently
    # showing the user just 1 cause.
    if len(causes) < 2:
        retry_prompt = (
            prompt
            + f'\n\nIMPORTANT: your previous answer only gave {len(causes) or 0} cause(s). '
              "This is not acceptable - you must include at least 2 distinct possible causes "
              "in the possible_causes array this time."
        )
        raw_text = _call_ollama(retry_prompt, temperature=0.55)
        try:
            retry_result = _extract_json(raw_text)
            retry_causes = retry_result.get("possible_causes") or []
            if len(retry_causes) >= 2:
                result = retry_result
                causes = retry_causes
        except (json.JSONDecodeError, AttributeError):
            pass  # keep whatever we already had from the first attempt
    if not causes:
        # Fallback shape (e.g. old-style {"condition": ..., "confidence": ...}
        # or a totally empty response) - wrap whatever we have into one cause.
        causes = [{
            "condition": result.get("condition", "Unable to determine"),
            "confidence": result.get("confidence", 50),
            "why": "",
        }]
    result["possible_causes"] = causes
    # Keep condition/confidence as the top (most likely) cause, for anything
    # (like the History screen) that expects a single label.
    result["condition"] = causes[0].get("condition", "Unable to determine")
    result["confidence"] = causes[0].get("confidence", 50)
    result.setdefault("recommendations", [])
    result.setdefault("treatment", [])
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Please consult a doctor for proper care.",
    )
    return result


def lookup_disease(query: str, language: str = "en") -> dict:
    """Ask the local Ollama model to explain a disease/condition the user
    searched for (used by the Encyclopedia's 'Ask AI' feature)."""
    prompt = f"""You are a medical information assistant inside a health app called MediScan.
A user searched for: "{query}".

Respond with ONLY a JSON object (no markdown, no preamble, no explanation outside the JSON) in exactly this shape:
{{
  "name": "canonical condition/disease name",
  "category": "one word category e.g. Viral, Bacterial, Chronic, Injury, Common",
  "risk_level": "Low" | "Moderate" | "High",
  "description": "1-2 sentence plain-English description",
  "symptoms": "comma-separated list of common symptoms",
  "causes": "1 sentence, in plain simple words, on the typical/common causes",
  "treatment": ["basic self-care tip in simple words", "a common OTC medicine category if appropriate, with a check-with-pharmacist reminder", "basic tip in simple words", "when to see a doctor"],
  "disclaimer": "one sentence reminding the user this is general information, not a medical diagnosis, and to consult a doctor for personal medical advice"
}}
Write everything in plain, simple, everyday words like you're explaining to a normal person, not a doctor - avoid medical jargon. For "treatment", mix BASIC self-care advice (rest, fluids, diet, sleep, when to see a doctor, etc.) with, where appropriate, a common over-the-counter medicine CATEGORY people generally use for it (e.g. "a pain reliever such as paracetamol", "an antacid", "an antihistamine") - only generic categories/common generic names, NEVER a specific dose/mg, brand, or prescription-only drug, and always add a quick reminder to check with a pharmacist or doctor first. Don't suggest medicine for anything that sounds serious - recommend seeing a doctor instead.
If "{query}" is not a real medical condition or symptom, still respond in this exact shape but make that clear in the description."""
    prompt += _language_instruction(language)

    try:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "format": "json",
                "keep_alive": "30m",
                "options": {"temperature": 0.3, "num_predict": 450, "num_ctx": 2048},
            },
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.ConnectError as exc:
        raise ConnectionError(
            f"Can't reach Ollama at {settings.ollama_base_url}. "
            f"Make sure it's running (`ollama serve`) and the model "
            f"`{settings.ollama_model}` is pulled (`ollama pull {settings.ollama_model}`)."
        ) from exc

    data = response.json()
    raw_text = data.get("message", {}).get("content", "")

    try:
        result = _extract_json(raw_text)
    except (json.JSONDecodeError, AttributeError):
        result = {
            "name": query,
            "category": "Common",
            "risk_level": "Moderate",
            "description": "Could not generate details for this right now.",
            "symptoms": "",
            "causes": "",
            "treatment": ["Consult a doctor for accurate information about this condition."],
        }

    result.setdefault("name", query)
    result.setdefault("category", "Common")
    result.setdefault("risk_level", "Moderate")
    result.setdefault("description", "")
    result.setdefault("symptoms", "")
    result.setdefault("causes", "")
    result.setdefault("treatment", [])
    result.setdefault(
        "disclaimer",
        "This is general information, not a medical diagnosis. Please consult a doctor for personal medical advice.",
    )
    return result


def _connection_error(model: str) -> ConnectionError:
    return ConnectionError(
        f"Can't reach Ollama at {settings.ollama_base_url}. "
        f"Make sure it's running (`ollama serve`) and the model "
        f"`{model}` is pulled (`ollama pull {model}`)."
    )


def generate_treatment_plan(
    disease: str,
    symptom_scores: dict,
    confidence: float,
    language: str = "en",
) -> dict:
    """Takes a disease predicted by the local ML model (app/ml, a
    RandomForestClassifier - NOT an LLM) plus the raw symptom scores that
    led to it, and asks the local Ollama model to turn that into a
    plain-language explanation + basic treatment plan. This is the "second
    stage": ML model decides WHAT it probably is, Ollama explains it simply
    and says what to do about it."""
    scores_text = ", ".join(f"{k}: {v}" for k, v in symptom_scores.items())
    prompt = f"""You are a medical assistant inside a health app called MediScan.
A machine-learning model analyzed a user's symptom readings ({scores_text}) and predicted the most likely condition is: "{disease}" (model confidence: {confidence}%).

Respond with ONLY a JSON object (no markdown, no preamble, no explanation outside the JSON) in exactly this shape:
{{
  "explanation": "1-2 sentence plain, simple explanation of why these symptom readings point to {disease}",
  "recommendations": ["basic everyday self-care tip in simple words", "basic everyday self-care tip in simple words", "a common OTC medicine category if appropriate, with a check-with-pharmacist reminder"],
  "treatment": ["basic home-care step in simple words", "a common OTC medicine category if appropriate, with a check-with-pharmacist reminder"],
  "when_to_see_doctor": "1 short sentence on warning signs that mean they should see a doctor promptly",
  "disclaimer": "one short sentence reminding the user this is not a medical diagnosis and to confirm with a doctor"
}}

Write everything in plain, simple, everyday words like you're talking to a normal person, not a doctor - avoid medical jargon. For medicine mentions: only generic OTC categories/common generic names (e.g. "a fever/pain reliever such as paracetamol", "an antihistamine", "ORS for fluids") - NEVER a specific dose/mg, brand name, or prescription-only drug, and always include a reminder to check with a pharmacist or doctor first. If "{disease}" sounds serious (e.g. Dengue, Malaria, Asthma attack), keep the tone appropriately cautious and lean towards recommending a doctor visit rather than just home care."""
    prompt += _language_instruction(language)

    def _call(user_prompt: str) -> str:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": [{"role": "user", "content": user_prompt}],
                "stream": False,
                "format": "json",
                "keep_alive": "30m",
                "options": {"temperature": 0.4, "num_predict": 500, "num_ctx": 2048},
            },
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
        return response.json().get("message", {}).get("content", "")

    try:
        raw_text = _call(prompt)
    except httpx.ConnectError as exc:
        raise _connection_error(settings.ollama_model) from exc

    try:
        result = _extract_json(raw_text)
    except (json.JSONDecodeError, AttributeError):
        result = {}

    result.setdefault("explanation", f"The readings you entered are commonly seen with {disease}.")
    result.setdefault("recommendations", ["Rest, drink plenty of fluids, and monitor how you feel."])
    result.setdefault("treatment", ["Basic home care: rest and fluids."])
    result.setdefault("when_to_see_doctor", "See a doctor if symptoms get worse or don't improve in a couple of days.")
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Please consult a doctor to confirm and get proper treatment.",
    )
    return result


def analyze_report_text(report_text: str, filename: str, language: str = "en") -> dict:
    """Take raw text extracted (via OCR/PDF parsing) from a lab report and
    ask the local Ollama model to pull out key metrics and give a plain-
    English summary."""
    prompt = f"""You are a medical report analysis assistant inside a health app called MediScan.
Below is text extracted from a lab report file named "{filename}":

---
{report_text[:6000]}
---

For "findings" and "recommendations": explain things in plain, simple, everyday words like you're talking to a normal person, not a doctor - avoid medical jargon and technical terms. Recommendations should mix BASIC everyday-life advice (diet, rest, water, sleep, follow-up with doctor, etc.) with, where a value is out of range and it's commonly relevant, a generic OTC medicine/supplement CATEGORY people commonly use (e.g. "an iron supplement for low hemoglobin", "an electrolyte/ORS drink for imbalance") - only generic categories, NEVER a specific dose/mg, brand, or prescription-only drug, and always add a quick reminder to check with a pharmacist or doctor first before starting anything.

Respond with ONLY a JSON object (no markdown, no preamble, no explanation outside the JSON) in exactly this shape:
{{
  "metrics": [
    {{"name": "Hemoglobin", "value": "12.5 g/dL", "status": "Normal"}}
  ],
  "findings": "1-2 sentence plain, simple summary of what the report shows",
  "confidence": <number 0-100, how confident you are in this reading>,
  "recommendations": ["basic everyday-life tip in simple words", "a generic supplement/medicine category if relevant, with a check-with-pharmacist reminder", "basic everyday-life tip in simple words"],
  "disclaimer": "one sentence reminding the user this is not a medical diagnosis and to consult a doctor for interpretation"
}}
Extract every lab value you can find as a separate metric. If a value falls outside a typical reference range mark status as "Low" or "High", otherwise "Normal"."""
    prompt += _language_instruction(language)

    try:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "format": "json",
                "keep_alive": "30m",
                "options": {"temperature": 0.3, "num_predict": 900, "num_ctx": 4096},
            },
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.ConnectError as exc:
        raise _connection_error(settings.ollama_model) from exc

    raw_text = response.json().get("message", {}).get("content", "")

    try:
        result = _extract_json(raw_text)
    except (json.JSONDecodeError, AttributeError):
        result = {
            "metrics": [],
            "findings": "Could not confidently parse metrics from this report. Try a clearer scan.",
            "confidence": 30,
            "recommendations": ["Re-scan the report with better lighting/focus if possible."],
        }

    result.setdefault("metrics", [])
    result.setdefault("findings", "")
    result.setdefault("confidence", 50)
    result.setdefault("recommendations", [])
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Please consult a doctor to interpret your report.",
    )
    return result


def analyze_injury_image(image_bytes: bytes, media_type: str, language: str = "en") -> dict:
    """Send an injury photo to a local Ollama vision model (e.g. llava) and
    get back an assessed injury type, severity, and treatment suggestions."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    prompt = """You are an injury triage assistant inside a health app called MediScan.
Look at this photo of a skin injury and respond with ONLY a JSON object (no markdown, no preamble, no explanation outside the JSON) in exactly this shape:
{
  "injury_type": "e.g. Minor Abrasion / Bruise / Laceration / Burn",
  "severity": "Low" | "Moderate" | "High",
  "confidence": <number 0-100>,
  "treatment_suggestions": ["basic first-aid tip in simple words", "basic first-aid tip in simple words", "a generic antiseptic/ointment category if appropriate, with a check-with-pharmacist reminder", "basic first-aid tip in simple words"],
  "disclaimer": "one sentence saying this is not a medical diagnosis and to seek in-person care for anything serious, deep, spreading, or not healing"
}
For "treatment_suggestions": give mostly BASIC first-aid advice (clean with water, cover with a clean cloth/bandage, apply a cold compress, keep it elevated, rest, etc.) in plain, simple, everyday words like you're talking to a normal person, not a doctor. Where relevant for a minor injury, you can mention a generic OTC category (e.g. "a basic antiseptic cream to prevent infection", "a mild pain reliever if it hurts") - only generic categories, NEVER a specific dose/mg, brand, or prescription-only drug, and add a reminder to check with a pharmacist first. Do NOT suggest any medicine for anything that looks deep, severe, infected, or serious - recommend seeing a doctor instead.
If the image does not clearly show an injury, say so honestly in injury_type and keep severity conservative."""
    prompt += _language_instruction(language)

    try:
        response = httpx.post(
            f"{settings.ollama_base_url}/api/chat",
            json={
                "model": settings.ollama_vision_model,
                "messages": [{"role": "user", "content": prompt, "images": [b64]}],
                "stream": False,
                "format": "json",
                "keep_alive": "30m",
                "options": {"temperature": 0.3, "num_predict": 500, "num_ctx": 2048},
            },
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
    except httpx.ConnectError as exc:
        raise _connection_error(settings.ollama_vision_model) from exc

    raw_text = response.json().get("message", {}).get("content", "")

    try:
        result = _extract_json(raw_text)
    except (json.JSONDecodeError, AttributeError):
        result = {
            "injury_type": "Unable to determine",
            "severity": "Moderate",
            "confidence": 30,
            "treatment_suggestions": [
                "Clean the area gently and keep it covered.",
                "Watch for signs of infection (redness, swelling, warmth).",
                "See a doctor if it's deep, won't stop bleeding, or isn't healing.",
            ],
        }

    result.setdefault("injury_type", "Unable to determine")
    result.setdefault("severity", "Moderate")
    result.setdefault("confidence", 50)
    result.setdefault("treatment_suggestions", [])
    result.setdefault(
        "disclaimer",
        "This is not a medical diagnosis. Please seek in-person care for anything serious, deep, spreading, or not healing.",
    )
    return result
