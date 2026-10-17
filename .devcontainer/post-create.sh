#!/usr/bin/env bash
set -euo pipefail

# Named volumes (and missing parent dirs) are created root-owned on first use
sudo chown -R "$(id -u):$(id -g)" "$HOME/.claude" "$HOME/.copilot" "$HOME/.config/gh"
sudo chown "$(id -u):$(id -g)" "$HOME/.config" "$HOME/.nuget" "$HOME/.nuget/packages" "$HOME/.npm" \
  src/frontend/athlify/node_modules

# Aspire CLI comes from the devcontainer feature
aspire certs trust --non-interactive

# Pinned local tools (dotnet-ef for migrations)
dotnet tool restore --tool-manifest src/backend/dotnet-tools.json

# node_modules is a container volume, so native Linux binaries never mix with the host's
cd src/frontend/athlify
npm ci
npm run relay
