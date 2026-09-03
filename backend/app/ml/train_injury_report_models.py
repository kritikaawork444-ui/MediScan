"""
Trains offline ML models used by MediScan:

1) Injury Analyzer
   - Renders synthetic injury / non-injury image patches
   - Extracts the SAME features as production (injury_ml_predictor.extract_features)
   - Binary is_injury classifier + multiclass type + severity

2) Report Scanner (lab values)

Run:
    cd backend
    python -m app.ml.train_injury_report_models
"""
from __future__ import annotations

import io
import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from PIL import Image, ImageDraw, ImageFilter
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

ML_DIR = Path(__file__).parent
DATA_DIR = ML_DIR / "data"
XLSX = DATA_DIR / "gender_dataset.xlsx"

INJURY_FEATURE_NAMES = [
    "mean_r", "mean_g", "mean_b",
    "std_r", "std_g", "std_b",
    "red_ratio", "dark_ratio", "bright_ratio",
    "rg_diff", "rb_diff",
    "edge_density", "contrast",
    "warmth", "purple_score", "yellow_score",
]

NOT_INJURY_LABEL = "Not an injury (unrelated photo)"

LAB_FEATURES = [
    "Hemoglobin", "WBC", "Platelets", "RBC", "Glucose",
    "Creatinine", "Urea", "Cholesterol", "HDL", "LDL",
    "Triglycerides", "TSH", "Vitamin_D", "ALT", "AST",
]

LAB_NORMAL = {
    "Hemoglobin": (14.0, 1.2),
    "WBC": (7.0, 1.5),
    "Platelets": (250.0, 50.0),
    "RBC": (4.8, 0.4),
    "Glucose": (95.0, 12.0),
    "Creatinine": (0.9, 0.15),
    "Urea": (25.0, 8.0),
    "Cholesterol": (170.0, 25.0),
    "HDL": (55.0, 10.0),
    "LDL": (90.0, 20.0),
    "Triglycerides": (110.0, 30.0),
    "TSH": (2.0, 0.7),
    "Vitamin_D": (40.0, 10.0),
    "ALT": (25.0, 10.0),
    "AST": (25.0, 10.0),
}

LAB_TEMPLATES = [
    ("Normal", "Normal", {}),
    ("Anemia", "Attention", {"Hemoglobin": (9.5, 1.0), "RBC": (3.6, 0.3), "Vitamin_D": (18.0, 5.0)}),
    ("Severe Anemia", "Critical", {"Hemoglobin": (7.0, 0.8), "RBC": (3.0, 0.25)}),
    ("Infection / Leukocytosis", "Attention", {"WBC": (15.0, 2.5)}),
    ("Leukopenia", "Attention", {"WBC": (2.8, 0.4)}),
    ("Thrombocytopenia", "Critical", {"Platelets": (70.0, 20.0)}),
    ("High platelets", "Attention", {"Platelets": (520.0, 40.0)}),
    ("Hyperglycemia", "Attention", {"Glucose": (180.0, 30.0)}),
    ("Hypoglycemia", "Critical", {"Glucose": (52.0, 6.0)}),
    ("Diabetes pattern", "Attention", {"Glucose": (210.0, 35.0), "Triglycerides": (220.0, 40.0), "HDL": (32.0, 5.0)}),
    ("Kidney stress", "Attention", {"Creatinine": (1.8, 0.25), "Urea": (55.0, 10.0)}),
    ("Acute kidney concern", "Critical", {"Creatinine": (3.2, 0.4), "Urea": (80.0, 12.0)}),
    ("High cholesterol", "Attention", {"Cholesterol": (260.0, 25.0), "LDL": (160.0, 20.0)}),
    ("Low HDL", "Attention", {"HDL": (28.0, 4.0)}),
    ("Thyroid high TSH", "Attention", {"TSH": (8.5, 1.5)}),
    ("Thyroid low TSH", "Attention", {"TSH": (0.1, 0.05)}),
    ("Vitamin D deficiency", "Attention", {"Vitamin_D": (12.0, 3.0)}),
    ("Liver enzyme rise", "Attention", {"ALT": (90.0, 20.0), "AST": (85.0, 18.0)}),
    ("Severe liver pattern", "Critical", {"ALT": (250.0, 40.0), "AST": (220.0, 35.0)}),
    ("Mixed metabolic", "Attention", {
        "Glucose": (160.0, 20.0), "Cholesterol": (240.0, 20.0),
        "Triglycerides": (200.0, 30.0), "Vitamin_D": (18.0, 4.0),
    }),
]


def _norm_sev(s: str) -> str:
    s = (s or "").strip().lower()
    if "emergency" in s:
        return "Emergency"
    if "severe" in s:
        return "Severe"
    if "moderate" in s:
        return "Moderate"
    if "mild" in s:
        return "Mild"
    return "Moderate"


# Collapse rare / near-duplicate labels into visual families for stronger ML signal
FAMILY_MAP = {
    "Cut/Laceration": "Cut/Laceration",
    "Laceration": "Cut/Laceration",
    "Puncture wound": "Cut/Laceration",
    "Severe bleeding": "Cut/Laceration",
    "Nosebleed (Epistaxis)": "Cut/Laceration",
    "Animal bite": "Cut/Laceration",
    "Abrasion (Scrape)": "Abrasion (Scrape)",
    "Bruise (Contusion)": "Bruise (Contusion)",
    "Sprain (Ankle)": "Sprain / Strain",
    "Sprain (Wrist)": "Sprain / Strain",
    "Ankle sprain (Grade II-III)": "Sprain / Strain",
    "Strain (Muscle pull - Hamstring)": "Sprain / Strain",
    "Strain (Lower back)": "Sprain / Strain",
    "Muscle strain (Grade I)": "Sprain / Strain",
    "Torn ligament (e.g., ACL)": "Sprain / Strain",
    "Rotator cuff injury": "Sprain / Strain",
    "Tendonitis (overuse)": "Sprain / Strain",
    "Shin splints": "Sprain / Strain",
    "Fracture (Simple/Closed)": "Fracture / Dislocation",
    "Fracture (Compound/Open)": "Fracture / Dislocation",
    "Dislocation (Shoulder)": "Fracture / Dislocation",
    "Dislocation (Finger)": "Fracture / Dislocation",
    "Burn (First-degree)": "Burn",
    "Burn (Second-degree)": "Burn",
    "Burn (Third-degree)": "Burn",
    "Burns (Thermal)": "Burn",
    "Chemical burn/exposure": "Burn",
    "Blister": "Burn",
    "Insect bite/sting": "Bite / Sting",
    "Allergic reaction (Severe)": "Bite / Sting",
    "Concussion / Mild Head Injury": "Head / Spine concern",
    "Concussion": "Head / Spine concern",
    "Head injury": "Head / Spine concern",
    "Whiplash": "Head / Spine concern",
    "Spinal injury (suspected)": "Head / Spine concern",
    "Eye injury (foreign object/scratch)": "Eye injury",
    "Broken/Chipped tooth": "Dental injury",
    "Frostbite": "Temperature injury",
    "Hypothermia": "Temperature injury",
    "Heat exhaustion/heat stroke": "Temperature injury",
    "Heat exhaustion": "Temperature injury",
    "Electric shock": "Electric / Other",
    "Choking": "Electric / Other",
    "Drowning/Near-drowning": "Electric / Other",
}


def _skin_tone(rng: np.random.Generator) -> tuple[int, int, int]:
    # varied skin tones
    base = rng.choice([
        (255, 224, 189), (241, 194, 125), (224, 172, 105),
        (198, 134, 92), (141, 85, 36), (90, 55, 30),
        (255, 205, 148), (210, 160, 120),
    ])
    noise = rng.integers(-12, 12, 3)
    return tuple(int(np.clip(base[i] + noise[i], 0, 255)) for i in range(3))


def _noise(img: np.ndarray, rng: np.random.Generator, amp: int = 10) -> np.ndarray:
    n = rng.integers(-amp, amp + 1, img.shape, dtype=np.int16)
    return np.clip(img.astype(np.int16) + n, 0, 255).astype(np.uint8)


def _draw_ellipse(arr, cy, cx, ry, rx, color, rng, jitter=8):
    h, w = arr.shape[:2]
    yy, xx = np.ogrid[:h, :w]
    mask = ((yy - cy) ** 2) / max(ry, 1) ** 2 + ((xx - cx) ** 2) / max(rx, 1) ** 2 <= 1
    col = np.array(color, dtype=np.int16)
    patch = arr[mask].astype(np.int16)
    patch[:] = col + rng.integers(-jitter, jitter + 1, patch.shape)
    arr[mask] = np.clip(patch, 0, 255).astype(np.uint8)
    return mask


def render_injury_image(family: str, severity: str, rng: np.random.Generator) -> Image.Image:
    """Render a simple but distinctive injury-looking photo patch."""
    h, w = 192, 256
    skin = _skin_tone(rng)
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    arr[:, :] = skin
    # subtle skin texture
    arr = _noise(arr, rng, 6)
    # mild shading gradient
    shade = np.linspace(-8, 8, w, dtype=np.float32)
    arr = np.clip(arr.astype(np.float32) + shade[None, :, None], 0, 255).astype(np.uint8)

    cy, cx = int(rng.integers(h // 3, 2 * h // 3)), int(rng.integers(w // 3, 2 * w // 3))

    if family == "Cut/Laceration":
        # red wound streak
        length = int(rng.integers(w // 3, int(w * 0.7)))
        thick = int(rng.integers(4, 14 if severity in ("Severe", "Emergency") else 10))
        angle = rng.uniform(-0.6, 0.6)
        for t in range(-thick, thick + 1):
            for i in range(length):
                x = int(cx - length // 2 + i)
                y = int(cy + t + i * angle)
                if 0 <= x < w and 0 <= y < h:
                    depth = 1.0 - abs(t) / (thick + 1)
                    r = int(40 + 100 * depth + rng.integers(0, 30))
                    arr[y, x] = [r, int(15 + 20 * (1 - depth)), int(15 + 15 * (1 - depth))]
        # blood smear
        if severity in ("Severe", "Emergency", "Moderate"):
            _draw_ellipse(arr, cy + 8, cx, rng.integers(6, 14), rng.integers(10, 22),
                          (120, 25, 25), rng, 15)

    elif family == "Abrasion (Scrape)":
        # rough scraped skin — high edge density, pink-brown, NOT yellow burn
        _draw_ellipse(arr, cy, cx, rng.integers(16, 30), rng.integers(22, 45),
                      (180, 95, 85), rng, 18)
        for _ in range(int(rng.integers(80, 160))):
            x = int(cx + rng.integers(-45, 45))
            y = int(cy + rng.integers(-30, 30))
            if 0 <= x < w and 0 <= y < h:
                arr[y, x] = [int(rng.integers(150, 210)), int(rng.integers(70, 120)), int(rng.integers(60, 100))]
        # tiny scab dots
        for _ in range(20):
            x = int(cx + rng.integers(-30, 30)); y = int(cy + rng.integers(-20, 20))
            if 0 <= x < w and 0 <= y < h:
                arr[y, x] = [90, 40, 35]

    elif family == "Bruise (Contusion)":
        # Strong purple/blue bruise — large area so purple_score fires in features
        stage = rng.choice(["purple", "blue", "indigo", "greenish"])
        colors = {
            "purple": (85, 55, 145),
            "blue": (55, 75, 155),
            "indigo": (70, 50, 130),
            "greenish": (70, 110, 95),
        }
        col = colors[stage]
        ry, rx = int(rng.integers(28, 55)), int(rng.integers(35, 70))
        _draw_ellipse(arr, cy, cx, ry, rx, col, rng, 14)
        # layered darker center (classic contusion)
        _draw_ellipse(arr, cy, cx, max(ry//2, 8), max(rx//2, 10),
                      (max(col[0] - 25, 25), max(col[1] - 15, 25), min(col[2] + 20, 190)), rng, 8)
        # outer reddish ring sometimes
        if rng.random() > 0.4:
            _draw_ellipse(arr, cy + rng.integers(-5, 5), cx + rng.integers(-5, 5),
                          ry + 4, rx + 4, (140, 90, 100), rng, 20)

    elif family == "Burn":
        # red-orange inflamed area + optional yellow blister
        _draw_ellipse(arr, cy, cx, rng.integers(20, 45), rng.integers(25, 55),
                      (230, int(rng.integers(70, 110)), int(rng.integers(50, 80))), rng, 12)
        if rng.random() > 0.35:
            _draw_ellipse(arr, cy, cx, rng.integers(6, 14), rng.integers(8, 16),
                          (235, 210, int(rng.integers(100, 150))), rng, 8)
        # shiny highlight
        _draw_ellipse(arr, cy - 6, cx - 6, 4, 6, (250, 230, 200), rng, 5)

    elif family == "Sprain / Strain":
        # swollen joint — puffy pink/red, soft edges, optional light bruise
        swell = (min(int(skin[0] * 0.75 + 55), 255),
                 max(int(skin[1] * 0.65), 40),
                 max(int(skin[2] * 0.65), 40))
        _draw_ellipse(arr, cy, cx, rng.integers(30, 55), rng.integers(35, 70), swell, rng, 8)
        if rng.random() > 0.4:
            _draw_ellipse(arr, cy + 6, cx - 5, rng.integers(12, 22), rng.integers(16, 30),
                          (110, 85, 135), rng, 10)

    elif family == "Fracture / Dislocation":
        # swelling + bruise + possible open red if compound-like
        _draw_ellipse(arr, cy, cx, rng.integers(18, 40), rng.integers(22, 50),
                      (170, 110, 110), rng, 12)
        _draw_ellipse(arr, cy, cx - 10, rng.integers(8, 16), rng.integers(10, 20),
                      (100, 70, 130), rng, 10)
        if "Emergency" in severity or "Severe" in severity or rng.random() > 0.6:
            _draw_ellipse(arr, cy, cx + 8, 5, 12, (140, 30, 30), rng, 10)

    elif family == "Bite / Sting":
        _draw_ellipse(arr, cy, cx, rng.integers(14, 28), rng.integers(14, 28),
                      (220, 90, 80), rng, 10)
        # central punctum
        _draw_ellipse(arr, cy, cx, 3, 3, (80, 30, 30), rng, 4)

    elif family == "Eye injury":
        # sclera-ish + red
        arr[:, :] = (240, 240, 245)
        arr = _noise(arr, rng, 4)
        _draw_ellipse(arr, h // 2, w // 2, 35, 55, (250, 250, 252), rng, 3)
        _draw_ellipse(arr, h // 2, w // 2, 14, 14, (80, 50, 30), rng, 5)
        _draw_ellipse(arr, h // 2, w // 2 - 20, 8, 18, (200, 40, 40), rng, 10)

    elif family == "Dental injury":
        arr[:, :] = (240, 220, 200)
        # tooth-like rectangle
        arr[70:140, 100:160] = (245, 240, 230)
        arr[90:120, 120:140] = (200, 200, 210)
        if rng.random() > 0.4:
            arr[100:130, 130:145] = (180, 40, 40)

    elif family == "Head / Spine concern":
        _draw_ellipse(arr, cy, cx, rng.integers(15, 30), rng.integers(18, 35),
                      (150, 90, 90), rng, 12)
        if rng.random() > 0.5:
            _draw_ellipse(arr, cy, cx, 8, 10, (100, 30, 30), rng, 8)

    elif family == "Temperature injury":
        if rng.random() > 0.5:
            # frost pale blue
            _draw_ellipse(arr, cy, cx, rng.integers(20, 40), rng.integers(25, 50),
                          (180, 195, 210), rng, 10)
        else:
            # heat flush
            _draw_ellipse(arr, cy, cx, rng.integers(20, 40), rng.integers(25, 50),
                          (220, 100, 90), rng, 10)

    else:  # Electric / Other
        _draw_ellipse(arr, cy, cx, rng.integers(12, 28), rng.integers(14, 30),
                      (100, 80, 70), rng, 12)
        for _ in range(15):
            x = int(cx + rng.integers(-30, 30))
            y = int(cy + rng.integers(-30, 30))
            if 0 <= x < w and 0 <= y < h:
                arr[y, x] = [40, 40, 40]

    # occasional motion blur-ish
    img = Image.fromarray(arr)
    if rng.random() > 0.7:
        img = img.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.4, 1.2)))
    # brightness jitter
    if rng.random() > 0.5:
        fac = rng.uniform(0.85, 1.15)
        arr2 = np.clip(np.asarray(img).astype(np.float32) * fac, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr2)
    return img


def render_non_injury_image(rng: np.random.Generator) -> Image.Image:
    """Diverse non-injury photos: sky, food, UI, plants, objects, plain wall, selfie-no-wound."""
    h, w = 192, 256
    kind = rng.integers(0, 12)
    arr = np.zeros((h, w, 3), dtype=np.uint8)

    if kind == 0:  # sky gradient
        for y in range(h):
            arr[y, :] = [80 + y // 3, 140 + y // 4, 220 - y // 8]
        arr = _noise(arr, rng, 8)
    elif kind == 1:  # grass/nature
        arr[:, :] = [50, 140, 60]
        arr = _noise(arr, rng, 25)
        for _ in range(30):
            y, x = rng.integers(0, h), rng.integers(0, w)
            rr = rng.integers(3, 10)
            _draw_ellipse(arr, y, x, rr, rr, (40, int(rng.integers(100, 180)), 40), rng, 15)
    elif kind == 2:  # food yellow/brown
        arr[:, :] = [int(rng.integers(180, 230)), int(rng.integers(140, 190)), int(rng.integers(40, 90))]
        arr = _noise(arr, rng, 20)
        _draw_ellipse(arr, h // 2, w // 2, 40, 50, (200, 100, 40), rng, 20)
    elif kind == 3:  # white wall / blank
        arr[:, :] = int(rng.integers(230, 250))
        arr = _noise(arr, rng, 3)
    elif kind == 4:  # dark night / black phone
        arr[:, :] = int(rng.integers(5, 35))
        arr = _noise(arr, rng, 5)
    elif kind == 5:  # plain skin selfie NO wound
        arr[:, :] = _skin_tone(rng)
        arr = _noise(arr, rng, 5)
        # maybe eye-ish dark spots but not wound
        _draw_ellipse(arr, h // 3, w // 3, 6, 8, (80, 60, 50), rng, 5)
        _draw_ellipse(arr, h // 3, 2 * w // 3, 6, 8, (80, 60, 50), rng, 5)
    elif kind == 6:  # UI screenshot
        arr[:, :] = [245, 246, 250]
        for i in range(4):
            y0 = 30 + i * 35
            arr[y0:y0 + 18, 20:w - 20] = [int(rng.integers(40, 120)), int(rng.integers(80, 160)), 200]
        arr = _noise(arr, rng, 2)
    elif kind == 7:  # solid color meme
        c = rng.choice([(230, 30, 30), (30, 200, 80), (40, 80, 230), (240, 200, 40)])
        arr[:, :] = c
    elif kind == 8:  # metal/car
        for y in range(h):
            v = 90 + int(40 * np.sin(y / 12))
            arr[y, :] = [v, v + 10, v + 20]
        arr = _noise(arr, rng, 10)
    elif kind == 9:  # water cyan
        arr[:, :] = [40, 150, 190]
        arr = _noise(arr, rng, 15)
    elif kind == 10:  # cluttered desk
        arr[:, :] = [160, 140, 120]
        arr = _noise(arr, rng, 30)
        for _ in range(12):
            y, x = rng.integers(0, h), rng.integers(0, w)
            _draw_ellipse(arr, y, x, rng.integers(5, 20), rng.integers(5, 25),
                          tuple(int(x) for x in rng.integers(20, 240, 3)), rng, 20)
    else:  # purple toy / random object
        arr[:, :] = [int(rng.integers(20, 200)) for _ in range(3)]
        arr = _noise(arr, rng, 20)
        _draw_ellipse(arr, h // 2, w // 2, 40, 50, tuple(int(x) for x in rng.integers(30, 220, 3)), rng, 25)

    img = Image.fromarray(arr)
    if rng.random() > 0.6:
        img = img.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.3, 1.5)))
    return img


def extract_features_from_image(img: Image.Image) -> np.ndarray:
    """Must match injury_ml_predictor.extract_features logic."""
    img = img.convert("RGB")
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
    return np.array([
        mean_r / 255.0, mean_g / 255.0, mean_b / 255.0,
        std_r / 80.0, std_g / 80.0, std_b / 80.0,
        red_ratio, dark_ratio, bright_ratio,
        rg_diff, rb_diff,
        edge_density, contrast,
        warmth, purple_score, yellow_score,
    ], dtype=np.float32)


def _img_to_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def train_injury_models():
    inj = pd.read_excel(XLSX, sheet_name="Injuries").fillna("")
    inj.columns = [c.strip() for c in inj.columns]
    rows = []
    seen = set()
    for _, r in inj.iterrows():
        name = str(r["Injury Type"]).strip()
        if not name or name in seen:
            continue
        seen.add(name)
        sev = _norm_sev(r["Severity"])
        cat = str(r["Category"]).strip() or "Injury"
        family = FAMILY_MAP.get(name, "Sprain / Strain")
        rows.append({
            "name": name,
            "family": family,
            "severity": sev,
            "category": cat,
            "body_part": str(r.get("Body Part", "")).strip(),
            "first_aid": str(r.get("First Aid / Immediate Steps", r.get("First Aid", ""))).strip(),
            "recovery_time": str(r.get("Recovery Time", "")).strip(),
            "when_to_see_doctor": str(r.get("When to See Doctor", "")).strip(),
            "red_flags": str(r.get("Red Flags", "")).strip(),
        })

    kb = {r["name"]: r for r in rows}
    # also index by family for advice fallback
    family_kb = {}
    for r in rows:
        family_kb.setdefault(r["family"], r)

    rng = np.random.default_rng(42)

    X, y_bin, y_type, y_sev = [], [], [], []

    # --- injury samples: render images → extract features ---
    families = sorted(set(FAMILY_MAP.values()))
    samples_per_family = 90
    for fam in families:
        # pick a severity distribution from real rows of this family
        sev_choices = [r["severity"] for r in rows if r["family"] == fam] or ["Moderate"]
        n = samples_per_family
        # bruises need extra weight — easy to miss on real photos
        if fam == "Bruise (Contusion)":
            n = samples_per_family + 40
        if fam == "Cut/Laceration":
            n = samples_per_family + 20
        for _ in range(n):
            sev = str(rng.choice(sev_choices))
            img = render_injury_image(fam, sev, rng)
            feats = extract_features_from_image(img)
            X.append(feats)
            y_bin.append(1)
            y_type.append(fam)
            y_sev.append(sev)

    # --- non-injury samples (more than one family so gate is strong) ---
    n_non = samples_per_family * max(3, len(families) // 2)
    for _ in range(n_non):
        img = render_non_injury_image(rng)
        feats = extract_features_from_image(img)
        X.append(feats)
        y_bin.append(0)
        y_type.append(NOT_INJURY_LABEL)
        y_sev.append("Mild")

    X = np.vstack(X)
    y_bin = np.asarray(y_bin, dtype=np.int32)

    type_le = LabelEncoder().fit(y_type)
    sev_le = LabelEncoder().fit(y_sev)
    y_t = type_le.transform(y_type)
    y_s = sev_le.transform(y_sev)

    # Binary split
    Xtr, Xte, yb_tr, yb_te, yt_tr, yt_te, ys_tr, ys_te = train_test_split(
        X, y_bin, y_t, y_s, test_size=0.2, random_state=42, stratify=y_bin
    )

    bin_model = RandomForestClassifier(
        n_estimators=120, max_depth=14, random_state=42, n_jobs=-1, class_weight="balanced_subsample"
    )
    bin_model.fit(Xtr, yb_tr)
    print("\n=== INJURY ML (image-rendered features) ===")
    print(f"Binary is_injury accuracy: {accuracy_score(yb_te, bin_model.predict(Xte)):.3f}")

    # Type model only on injury samples
    inj_mask_tr = yb_tr == 1
    inj_mask_te = yb_te == 1
    type_model = RandomForestClassifier(
        n_estimators=120, max_depth=14, random_state=42, n_jobs=-1, class_weight="balanced_subsample"
    )
    type_model.fit(Xtr[inj_mask_tr], yt_tr[inj_mask_tr])
    if inj_mask_te.sum() > 0:
        # map predictions only among injury classes — filter encoder classes that are injury
        preds = type_model.predict(Xte[inj_mask_te])
        # accuracy among injury rows that have injury labels
        print(f"Type accuracy (injury only): {accuracy_score(yt_te[inj_mask_te], preds):.3f}")

    sev_model = RandomForestClassifier(
        n_estimators=80, max_depth=10, random_state=42, n_jobs=-1, class_weight="balanced_subsample"
    )
    sev_model.fit(Xtr[inj_mask_tr], ys_tr[inj_mask_tr])
    if inj_mask_te.sum() > 0:
        print(f"Severity accuracy (injury only): {accuracy_score(ys_te[inj_mask_te], sev_model.predict(Xte[inj_mask_te])):.3f}")

    # Fit final on all data
    bin_model.fit(X, y_bin)
    type_model.fit(X[y_bin == 1], y_t[y_bin == 1])
    sev_model.fit(X[y_bin == 1], y_s[y_bin == 1])

    meta = {
        "feature_names": INJURY_FEATURE_NAMES,
        "type_classes": list(type_le.classes_),
        "severity_classes": list(sev_le.classes_),
        "kb": kb,
        "family_kb": family_kb,
        "family_map": FAMILY_MAP,
        "not_injury_label": NOT_INJURY_LABEL,
        "min_injury_proba": 0.55,
        "version": "injury_v2_render_binary",
    }
    bundle = {
        "binary_model": bin_model,
        "type_model": type_model,
        "severity_model": sev_model,
        "type_encoder": type_le,
        "severity_encoder": sev_le,
        "version": "injury_v2_render_binary",
    }
    joblib.dump(bundle, ML_DIR / "injury_ml_model.joblib")
    joblib.dump(meta, ML_DIR / "injury_ml_meta.joblib")
    print(f"Saved {ML_DIR / 'injury_ml_model.joblib'}  classes={list(type_le.classes_)}")


def _sample_labs(rng: np.random.Generator, overrides: dict) -> dict:
    vals = {}
    for k, (mu, sd) in LAB_NORMAL.items():
        if k in overrides:
            mu, sd = overrides[k]
        vals[k] = float(np.clip(rng.normal(mu, sd), 0.01, 800))
    return vals


def train_report_models():
    rng = np.random.default_rng(7)
    X, y_status, y_pattern = [], [], []
    for pattern, status, overrides in LAB_TEMPLATES:
        n = 200 if pattern == "Normal" else 100
        for _ in range(n):
            labs = _sample_labs(rng, overrides)
            vec = []
            for f in LAB_FEATURES:
                if rng.random() < 0.12:
                    vec.append(-1.0)
                else:
                    mu, sd = LAB_NORMAL[f]
                    z = (labs[f] - mu) / (sd + 1e-6)
                    vec.append(float(z))
            X.append(vec)
            y_status.append(status)
            y_pattern.append(pattern)

    X = np.asarray(X, dtype=np.float32)
    status_le = LabelEncoder().fit(y_status)
    pattern_le = LabelEncoder().fit(y_pattern)
    ys = status_le.transform(y_status)
    yp = pattern_le.transform(y_pattern)

    Xtr, Xte, ys_tr, ys_te, yp_tr, yp_te = train_test_split(
        X, ys, yp, test_size=0.2, random_state=42, stratify=yp
    )

    status_model = GradientBoostingClassifier(random_state=42)
    pattern_model = RandomForestClassifier(
        n_estimators=180, max_depth=12, random_state=42, n_jobs=-1, class_weight="balanced_subsample"
    )
    status_model.fit(Xtr, ys_tr)
    pattern_model.fit(Xtr, yp_tr)

    print("\n=== REPORT ML ===")
    print(f"Status accuracy:  {accuracy_score(ys_te, status_model.predict(Xte)):.3f}")
    print(f"Pattern accuracy: {accuracy_score(yp_te, pattern_model.predict(Xte)):.3f}")

    status_model.fit(X, ys)
    pattern_model.fit(X, yp)

    meta = {
        "feature_names": LAB_FEATURES,
        "status_classes": list(status_le.classes_),
        "pattern_classes": list(pattern_le.classes_),
        "lab_normal": LAB_NORMAL,
        "lab_ref": {
            "Hemoglobin": (12.0, 17.5, "g/dL"),
            "WBC": (4.0, 11.0, "×10³/µL"),
            "Platelets": (150.0, 450.0, "×10³/µL"),
            "RBC": (4.0, 6.0, "×10⁶/µL"),
            "Glucose": (70.0, 140.0, "mg/dL"),
            "Creatinine": (0.6, 1.3, "mg/dL"),
            "Urea": (7.0, 45.0, "mg/dL"),
            "Cholesterol": (0.0, 200.0, "mg/dL"),
            "HDL": (40.0, 999.0, "mg/dL"),
            "LDL": (0.0, 100.0, "mg/dL"),
            "Triglycerides": (0.0, 150.0, "mg/dL"),
            "TSH": (0.4, 4.5, "mIU/L"),
            "Vitamin_D": (30.0, 100.0, "ng/mL"),
            "ALT": (0.0, 55.0, "U/L"),
            "AST": (0.0, 48.0, "U/L"),
        },
        "advice": {
            "Normal": [
                "Values look broadly within common adult ranges (lab-specific ranges may differ).",
                "Keep a copy for your doctor and maintain diet, sleep, and hydration.",
                "Repeat routine labs as your clinician advises.",
            ],
            "Attention": [
                "Some values are outside common ranges — discuss with your doctor.",
                "Do not start/stop prescription medicines based only on this scan.",
                "Note related symptoms (fatigue, thirst, pain, bruising) for your visit.",
                "Ask whether a repeat test at the same lab is needed.",
            ],
            "Critical": [
                "One or more values look significantly abnormal — seek medical care promptly.",
                "If you have chest pain, confusion, severe bleeding, or breathlessness, go to ER.",
                "Bring this report to a clinician today or as soon as possible.",
                "Do not self-medicate high-risk abnormalities.",
            ],
        },
        "pattern_advice": {
            "Anemia": "Pattern suggests low hemoglobin/RBC — discuss anemia workup (iron, B12, etc.).",
            "Severe Anemia": "Severely low hemoglobin pattern — urgent clinical review recommended.",
            "Infection / Leukocytosis": "Elevated WBC pattern can reflect infection/inflammation — clinical correlation needed.",
            "Leukopenia": "Low WBC pattern — avoid self-judgment; clinician should interpret.",
            "Thrombocytopenia": "Low platelets raise bleeding risk — urgent medical advice recommended.",
            "Hyperglycemia": "High glucose pattern — discuss diabetes screening / medication review.",
            "Hypoglycemia": "Low glucose can be dangerous — treat per medical advice and seek care if symptomatic.",
            "Diabetes pattern": "Metabolic pattern consistent with poor glucose control — clinician follow-up.",
            "Kidney stress": "Kidney markers elevated — hydration + clinician review of meds/kidney health.",
            "Acute kidney concern": "Markedly abnormal kidney markers — prompt medical care.",
            "High cholesterol": "Lipid pattern elevated — diet, activity, and clinician risk assessment.",
            "Liver enzyme rise": "Liver enzymes up — avoid alcohol; review meds with a doctor.",
            "Severe liver pattern": "Significantly elevated liver enzymes — medical evaluation soon.",
            "Vitamin D deficiency": "Low vitamin D pattern — diet/sunlight/supplement only if clinician agrees.",
            "Thyroid high TSH": "TSH high pattern may suggest underactive thyroid — needs clinical confirmation.",
            "Thyroid low TSH": "TSH low pattern may suggest overactive thyroid — needs clinical confirmation.",
            "Normal": "No dominant abnormality pattern detected from available values.",
        },
    }
    bundle = {
        "status_model": status_model,
        "pattern_model": pattern_model,
        "status_encoder": status_le,
        "pattern_encoder": pattern_le,
    }
    joblib.dump(bundle, ML_DIR / "report_ml_model.joblib")
    joblib.dump(meta, ML_DIR / "report_ml_meta.joblib")
    (ML_DIR / "report_ml_advice.json").write_text(json.dumps(meta["advice"], indent=2), encoding="utf-8")
    print(f"Saved {ML_DIR / 'report_ml_model.joblib'}")


if __name__ == "__main__":
    if not XLSX.exists():
        raise SystemExit(f"Missing dataset: {XLSX}")
    train_injury_models()
    train_report_models()
    print("\nDone.")
