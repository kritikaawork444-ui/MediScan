#!/bin/bash
# Run this on your Mac inside the MediScan project folder
set -e
REPO="https://github.com/aakibpatel1112-stack/Mediscan.git"

echo "==> Repo: $REPO"
echo "==> Working dir: $(pwd)"

if [ ! -d backend ] || [ ! -d frontend ]; then
  echo "ERROR: backend/ and frontend/ not found. cd into medicine project first."
  exit 1
fi

# init if needed
if [ ! -d .git ]; then
  git init
  git branch -M main
fi

git branch -M main 2>/dev/null || true

# remote
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO"
else
  git remote add origin "$REPO"
fi

echo "==> Staging files (respects .gitignore)..."
git add -A
git status --short | head -40

# abort if secrets staged
if git status --short | grep -E '(^..|\s)\.env$|node_modules|\.venv/' ; then
  echo "ERROR: secret or heavy folder staged — fix .gitignore"
  exit 1
fi

if git diff --cached --quiet 2>/dev/null && git rev-parse HEAD >/dev/null 2>&1; then
  echo "==> Nothing new to commit (ok if already committed)"
else
  git -c user.name="${GIT_NAME:-Akib Patel}" -c user.email="${GIT_EMAIL:-aakibpatel1112@users.noreply.github.com}" \
    commit -m "MediScan: full app — API, React UI, ML models" || true
fi

echo "==> Pushing to GitHub (login / token may be required)..."
git push -u origin main

echo ""
echo "DONE. Open: https://github.com/aakibpatel1112-stack/Mediscan"
