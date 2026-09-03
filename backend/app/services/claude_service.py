"""
This module is the only place in the backend that talks to Claude.
It powers the report findings and injury analysis features. (The symptom
checker no longer uses Claude - see app/services/ollama_service.py.) We
always ask Claude to answer in strict JSON so the backend can parse it
reliably and hand clean structured data to the frontend.
"""
import base64
import json
import re

from anthropic import Anthropic

from app.config import settings

_client = Anthropic(api_key=settings.anthropic_api_key)


def _extract_json(text: str) -> dict:
    """Claude sometimes wraps JSON in ```json fences despite instructions -
    strip those before parsing so a stray fence never breaks the app."""
    cleaned = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def analyze_report_text(report_text: str, filename: str) -> dict:
    """Take raw text extracted (via OCR/PDF parsing) from a lab report and
    ask Claude to pull out key metrics and give a plain-English summary."""
    prompt = f"""You are a medical report analysis assistant inside a health app called MediScan.
Below is text extracted from a lab report file named "{filename}":

---
{report_text[:6000]}
---

Respond with ONLY a JSON object (no markdown, no preamble) in exactly this shape:
{{
  "metrics": [
    {{"name": "Hemoglobin", "value": "12.5 g/dL", "status": "Normal"}}
  ],
  "findings": "1-2 sentence plain-English summary of what the report shows",
  "confidence": <number 0-100, how confident you are in this reading>,
  "recommendations": ["short actionable tip", "short actionable tip", "short actionable tip"],
  "disclaimer": "one sentence reminding the user this is not a medical diagnosis and to consult a doctor for interpretation"
}}
Extract every lab value you can find as a separate metric. If a value falls outside a typical reference range mark status as "Low" or "High", otherwise "Normal"."""

    response = _client.messages.create(
        model=settings.claude_model,
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    return _extract_json(response.content[0].text)


def analyze_injury_image(image_bytes: bytes, media_type: str) -> dict:
    """Send an injury photo to Claude's vision capability and get back
    an assessed injury type, severity, and treatment suggestions."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    prompt = """You are an injury triage assistant inside a health app called MediScan.
Look at this photo of a skin injury and respond with ONLY a JSON object (no markdown, no preamble) in exactly this shape:
{
  "injury_type": "e.g. Minor Abrasion / Bruise / Laceration / Burn",
  "severity": "Low" | "Moderate" | "High",
  "confidence": <number 0-100>,
  "treatment_suggestions": ["short first-aid tip", "short first-aid tip", "short first-aid tip", "short first-aid tip"],
  "disclaimer": "one sentence saying this is not a medical diagnosis and to seek in-person care for anything serious, deep, spreading, or not healing"
}
If the image does not clearly show an injury, say so honestly in injury_type and keep severity conservative."""

    response = _client.messages.create(
        model=settings.claude_model,
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": b64}},
                {"type": "text", "text": prompt},
            ],
        }],
    )
    return _extract_json(response.content[0].text)
