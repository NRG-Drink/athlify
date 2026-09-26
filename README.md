# Athlify

![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-Hot%20Chocolate-E10098?logo=graphql&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Status](https://img.shields.io/badge/status-prototype-orange)

## Table of Contents

- [Overview & Features](#overview--features)
- [Tech Stack & Sources](#tech-stack--sources)
- [Documentation](#documentation)
- [Getting Started & Installation](#getting-started--installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [Issues](#issues)
- [License](#license)

## Overview & Features

Athlify is a self-hosted web application for cyclists. It will import
activities from Strava, support manual activity management and provide
personal analysis of training, bicycles, body data and relevant events. The
functional scope is defined in the [software concept](docs/concept/CONCEPT.md).

The product is not implemented yet. The repository currently contains:

- **Backend prototype**: a GraphQL API with Body-Stats queries and mutations
  on an in-memory database with seeded sample data, plus endpoint tests.
- **Frontend app shell**: a React app with light/dark color mode, a
  German/English language switcher, routing and prototype Body-Stats charts
  built from sample data. It does not call the backend yet.

## Tech Stack & Sources

| Area     | Technology                                                                                  |
| -------- | ------------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Chakra UI v3, Tailwind CSS v4, react-router-dom, i18next, Recharts |
| Backend  | .NET 10, ASP.NET Core, Hot Chocolate GraphQL 16, EF Core InMemory (PostgreSQL planned)      |
| Testing  | TUnit (backend); Vitest + React Testing Library, ESLint, Prettier and `tsc` (frontend)      |

```text
src/
├── backend/              # Athlify.slnx: Athlify.Api + Athlify.Api.Tests
└── frontend/athlify/     # React/Vite app (standalone npm package)
```

The planned target stack is described in the
[technology stack](docs/concept/technology-stack.md). Architecture decisions
are recorded as ADRs (see [Documentation](#documentation)).

## Documentation

- [Documentation hub](docs/README.md): product, requirements and technical
  documents.
- [AI documentation index](docs/copilot/README.md): source authority,
  frontend/backend context, ADRs and learnings for AI-assisted work.
- [Glossary](docs/GLOSSARY.md): shared domain and UI terminology.
- [Configuration](docs/CONFIGURATION.md): ports, settings and tooling
  configuration.
- [Contributing guide](docs/CONTRIBUTING.md): branches, commits, hooks and
  documentation rules.

## Getting Started & Installation

### Prerequisites

- .NET 10 SDK
- Node.js 20 or later with npm

### Install

```bash
cd src/frontend/athlify
npm install       # installs the frontend dependencies
npm run relay     # generates the git-ignored Relay artifacts
```

### Run

```bash
# Backend: GraphQL endpoint at http://localhost:5095/graphql
dotnet run --project src/backend/Athlify.Api

# Frontend: Vite dev server (http://localhost:5173 by default)
cd src/frontend/athlify && npm run dev
```

## Usage

- Open `http://localhost:5095/graphql` to explore the schema in the
  Hot Chocolate GraphQL IDE (for example, `bodyStats`, `addBodyStats`).
- Open the frontend and go to **Body-Stats** to see the prototype charts.
  Use the user menu in the header to switch the color mode and the language.

Common checks:

```bash
dotnet run --project src/backend/Athlify.Api.Tests   # backend tests (TUnit)
cd src/frontend/athlify
npm test
npm run typecheck
npm run lint
npm run build
```

This is a prototype. Do not treat it as the completed Athlify product.

## Contributing

This is a private, GitHub-hosted student project by a two-person team.
Work on a feature branch and open a pull request into `develop`. There are no
git hooks, so run the checks above before committing. Keep the functional
concept, the technical documents and the glossary in sync with your change, and follow [AGENTS.md](AGENTS.md). See
the [contributing guide](docs/CONTRIBUTING.md) for details.

## Issues

Report defects and propose changes through the repository's private GitHub
issues and pull requests.

## License

This repository does not declare an open-source license. All rights are
reserved unless the project owners give separate permission.
