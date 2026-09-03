"""
Trains the symptom -> disease classifier used by the ML Symptom Predictor
feature (/api/symptoms/predict-ml).

Input: dataset1.csv with columns Fever, Headache, Cough, Fatigue, Body_Pain
(numeric severity/temperature scores) and Disease (label).

Run this whenever you get new/updated training data:
    cd backend
    python -m app.ml.train_model /path/to/dataset1.csv

It saves two files next to this script:
    disease_model.joblib     - the trained RandomForestClassifier
    label_encoder.joblib     - maps between disease names and model output indices
"""
import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder

FEATURE_COLUMNS = ["Fever", "Headache", "Cough", "Fatigue", "Body_Pain"]
MODEL_DIR = Path(__file__).parent
MODEL_PATH = MODEL_DIR / "disease_model.joblib"
ENCODER_PATH = MODEL_DIR / "label_encoder.joblib"


def train(csv_path: str) -> None:
    df = pd.read_csv(csv_path)
    missing = [c for c in FEATURE_COLUMNS + ["Disease"] if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}")

    X = df[FEATURE_COLUMNS]
    y_raw = df["Disease"]

    encoder = LabelEncoder()
    y = encoder.fit_transform(y_raw)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    pred = model.predict(X_test)
    print(f"Test accuracy: {accuracy_score(y_test, pred):.3f}")
    print(classification_report(y_test, pred, target_names=encoder.classes_))

    cv_scores = cross_val_score(model, X, y, cv=5)
    print(f"5-fold CV accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")

    # Refit on ALL the data before saving, so the shipped model uses every
    # row available, not just the 80% training split.
    model.fit(X, y)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    print(f"\nSaved model -> {MODEL_PATH}")
    print(f"Saved label encoder -> {ENCODER_PATH}")


if __name__ == "__main__":
    csv_path = sys.argv[1] if len(sys.argv) > 1 else "dataset1.csv"
    train(csv_path)
