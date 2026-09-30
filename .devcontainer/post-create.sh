#!/usr/bin/env bash
set -euo pipefail

# Aspire CLI (used by `aspire run`)
dotnet tool install --global Aspire.Cli || echo "Aspire CLI install failed; use 'dotnet run --project src/backend/Athlify.AppHost' instead."

dotnet dev-certs https --trust || true

cd src/frontend/athlify
npm install
npm run relay
