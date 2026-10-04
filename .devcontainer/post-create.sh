#!/usr/bin/env bash
set -euo pipefail

# Aspire CLI (used by `aspire run`)
dotnet tool install --global Aspire.Cli || echo "Aspire CLI install failed; use 'dotnet run --project src/backend/Athlify.AppHost' instead."

aspire certs trust --non-interactive

# Make sure vite is not installed on a windows machine!
cd src/frontend/athlify
npm install
npm run relay
