#!/usr/bin/env bash
set -euo pipefail

# Ensure devDependencies install even when NODE_ENV=production
export NPM_CONFIG_PRODUCTION=false
export NODE_ENV=development

echo "==> Installing frontend dependencies"
cd frontend
npm install --no-fund --no-audit
echo "==> Building frontend"
npx vite build
cd ..

echo "==> Installing backend dependencies"
cd backend
npm install --no-fund --no-audit
echo "==> Building backend"
npx tsc
cd ..

echo "==> Copying frontend into backend"
node scripts/copy-frontend.js

echo "==> Build complete"
