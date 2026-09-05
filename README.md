# MediScan — AI Health Assistant

Full-stack app: **FastAPI** backend + **React (Vite + Tailwind)** frontend.

Private-first health triage: symptom checker, offline ML, injury photo ML (rejects non-injury images), lab report scan, gender-aware ML, encyclopedia, history, and **free doctor consult** booking. UI: English · हिंदी · Hinglish.

---

## Quick start (local)

**Python 3.12 recommended** (3.14 breaks some wheels).

### Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional edit
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- Dev proxy: `/api` → backend `:8000`

### Optional: offline ML (richer AI text)

```bash
offline-ml serve
offline-ml pull llama3.1
# offline-ml pull llava   # vision; injury still has offline ML
```

App works **without** offline ML via offline KB + scikit-learn models.

---

## Features

| Feature | Notes |
|---------|--------|
| AI Symptom Checker | Offline guide + optional offline ML; localized results |
| ML Symptom Predictor | Trained RandomForest |
| Gender Health ML | Spreadsheet male/female notes |
| Injury Analyzer | ML v2 binary gate + injury families |
| Report Scanner | Lab parse + ML risk pattern |
| Doctor Consult | Real cards, ₹0 book/call, feedback |
| History / Profile | SQLite |
| i18n | en / hi / hinglish |

### Retrain ML (optional)

```bash
cd backend && source .venv/bin/activate
python -m app.ml.train_gender_model
python -m app.ml.train_injury_report_models
python -m app.ml.train_model
```

---

## Project layout

```
backend/app/          FastAPI, routers, services, ml/
frontend/src/         React pages & components
PUSH_TO_GITHUB.sh     Push main to GitHub (run on Mac)
```

---

## Disclaimer

Not a medical device or diagnosis. For emergencies seek local emergency care.
