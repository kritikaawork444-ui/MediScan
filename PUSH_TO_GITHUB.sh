#!/usr/bin/env bash
# Run on your Mac (GitHub logged in) from this medicine folder.
set -euo pipefail
cd "$(dirname "$0")"

REMOTE="${1:-https://github.com/kritikaawork444-ui/MediScan.git}"

echo "==> Repo: $(pwd)"
echo "==> HEAD: $(git log -1 --oneline)"
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
git remote -v

echo ""
echo "==> Pushing main → $REMOTE"
if git push -u origin main; then
  echo "OK: pushed main"
else
  echo "Normal push failed — trying --force (overwrites remote main with this tree)"
  git push -u origin main --force
fi

echo ""
echo "Done. Check: https://github.com/kritikaawork444-ui/MediScan"
