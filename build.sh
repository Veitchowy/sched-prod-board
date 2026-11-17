#!/bin/bash
# Build dist/ from app/: real config (from the challenge's .secrets, never committed) and the git sha (R6).
set -euo pipefail
cd "$(dirname "$0")"
[ -z "$(git status --porcelain -- app)" ] || { echo "app/ has uncommitted changes: commit first so the sha names this build" >&2; exit 1; }
SHA=$(git rev-parse HEAD)
rm -rf dist && cp -R app dist
source ../.secrets/course.env
cat > dist/config.js <<EOF
// Where the board reads from (written at build time; not in git).
export const API = 'https://hq.mega.dev/challenges/show-me-when/api';
export const SESSION = '${SESSION}';
EOF
sed -i '' "s/__BUILD_SHA__/${SHA}/g" dist/index.html
[ -d ../media ] && mkdir -p dist/media && cp ../media/*.webm dist/media/ 2>/dev/null || true
echo "built dist/ at ${SHA}"
