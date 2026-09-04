# MediScan — GitHub + Deploy

## A) Code GitHub pe daalo

### 1. GitHub pe naya repo banao

1. https://github.com/new  
2. Name: `MediScan` (public/private)  
3. **README / .gitignore mat add karo** (repo khali rakho)  
4. Create repository  

### 2. Apne Mac / PC pe (project folder me)

```bash
cd ~/Downloads/medicine   # ya jahan project hai

# pehli baar
git init
git add .
git status                 # .env / .venv / node_modules NAHI hone chahiye
git commit -m "Initial commit: MediScan AI Health Assistant"

git branch -M main
git remote add origin https://github.com/aakibpatel1112-stack/Mediscan.git
git push -u origin main
```

Login: browser / Personal Access Token (password ki jagah token).

**SSH use karte ho to:**

```bash
git remote add origin git@github.com:aakibpatel1112-stack/Mediscan.git
git push -u origin main
```

### 3. Baad me updates

```bash
git add .
git commit -m "Describe change"
git push
```

---

## B) Live website (competition demo URL)

Do services:

| Part | Free option | Role |
|------|-------------|------|
| **Backend API** | [Render](https://render.com) | FastAPI `:8000` |
| **Frontend** | [Vercel](https://vercel.com) | React build |

### Backend — Render

1. Render → **New → Web Service** → GitHub `MediScan` connect  
2. Settings:
   - **Root Directory:** `backend`  
   - **Runtime:** Python 3  
   - **Build:** `pip install -r requirements.txt`  
   - **Start:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
3. Env (optional):
   - `JWT_SECRET_KEY` = random string  
   - `FRONTEND_ORIGIN` = apna Vercel URL (baad me)  
4. Deploy → URL milegi jaise:  
   `https://mediscan-api-xxxx.onrender.com`  
5. Test: `https://mediscan-api-xxxx.onrender.com/docs`

> Free tier pe pehli request slow / sleep ho sakti hai — demo se 1 min pehle open kar lena.

### Frontend — Vercel

1. Vercel → **Add New Project** → GitHub `MediScan`  
2. Settings:
   - **Root Directory:** `frontend`  
   - Framework: Vite  
   - Build: `npm run build`  
   - Output: `dist`  
3. **Environment Variable:**
   - Name: `VITE_API_URL`  
   - Value: `https://mediscan-api-xxxx.onrender.com`  
     (trailing slash mat do)  
4. Deploy → URL: `https://mediscan-xxx.vercel.app`

### Netlify (frontend alternative)

- Base: `frontend`  
- Build: `npm run build`  
- Publish: `frontend/dist`  
- Env: `VITE_API_URL` = API URL  

---

## C) Local vs production

| | Local | Production |
|--|--------|------------|
| Frontend API | Vite proxy `/api` → `localhost:8000` | `VITE_API_URL` full API origin |
| Backend | `uvicorn ... --port 8000` | Render `$PORT` |
| `.env` | `backend/.env` (gitignored) | Hosting dashboard env vars |

---

## D) Mat push karna

- `backend/.env`  
- `.venv/` / `node_modules/`  
- `*.db` local databases  
- API keys  

Templates: `backend/.env.example`, `frontend/.env.example`

ML `.joblib` models **repo me rehne do** taaki Render pe retrain na pade.

---

## E) Quick verify after deploy

1. API `/docs` opens  
2. `GET /api/injury/ml-status` → `"ready": true`  
3. Frontend se symptom check  
4. Browser console me CORS / network error na ho  

CORS ab backend pe `allow_origins=["*"]` hai — demo OK.

---

## F) GitHub-only (bina live host)

Agar sirf code share karna hai:

```bash
git push -u origin main
```

Judges README se local run karenge (Python **3.12** recommended).

---

## Troubleshooting

| Issue | Fix |
|--------|-----|
| `failed to push` auth | PAT: GitHub → Settings → Developer settings → Token (repo scope) |
| Frontend API 404 | `VITE_API_URL` set + **redeploy** frontend |
| Render build fail Python | `PYTHON_VERSION=3.12.8` env |
| Large push | Models ~35MB — OK; agar reject ho to Git LFS |
| `.env` galti se push | Turant secret rotate + `git rm --cached backend/.env` |
