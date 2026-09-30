#!/usr/bin/env bash
set -euo pipefail

# Aspire CLI (used by `aspire run`)
curl -sSL https://aspire.dev/install.sh | bash || echo "Aspire CLI install failed; use 'dotnet run --project src/backend/Athlify.AppHost' instead."

dotnet dev-certs https --trust || true

cd src/frontend/athlify
npm install
npm run relay
