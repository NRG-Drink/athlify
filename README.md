# Athlify

![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-Hot%20Chocolate-E10098?logo=graphql&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Status](https://img.shields.io/badge/status-prototype-orange)

## Table of Contents

- [Athlify](#athlify)
  - [Table of Contents](#table-of-contents)
  - [Overview \& Features](#overview--features)
  - [Tech Stack \& Sources](#tech-stack--sources)
  - [Documentation](#documentation)
  - [Getting Started \& Installation](#getting-started--installation)
    - [Prerequisites](#prerequisites)
    - [Install](#install)
    - [Dev Container](#dev-container)
    - [Run](#run)
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
  German/English language switcher, routing and a Body-Stats page (summary
  tiles, chart, history table, add/edit/delete) that uses the backend API.

## Tech Stack & Sources

| Area     | Technology                                                                                  |
| -------- | ------------------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Chakra UI v3 (custom theme), Tailwind CSS v4, react-router-dom, i18next, Recharts, self-hosted Inter and Barlow Semi Condensed |
| Backend  | .NET 10, ASP.NET Core, Hot Chocolate GraphQL 16, EF Core + PostgreSQL (Aspire)              |
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
- [Personas](docs/copilot/personas.md): who the UI is designed for.
- [Configuration](docs/CONFIGURATION.md): ports, settings and tooling
  configuration.
- [Contributing guide](docs/CONTRIBUTING.md): branches, commits, hooks and
  documentation rules.

## Getting Started & Installation

### Prerequisites

- .NET 10 SDK
- Node.js 20 or later with npm
- Docker

### Install

```bash
cd src/frontend/athlify
npm install       # installs the frontend dependencies
npm run relay     # generates the git-ignored Relay artifacts
```

### Dev Container

`.devcontainer/` provides a ready-to-use environment (.NET 10 SDK, Node.js 22,
Docker access, Aspire CLI). Open the repository in VS Code and choose
**Reopen in Container**; dependencies are installed and the Relay artifacts
generated automatically. The host's Docker daemon must be running, because
Aspire starts PostgreSQL as a container. In WebStorm (JetBrains Gateway) the
container installs the Markdown, Mermaid, GraphQL (with Relay support via
`graphql.config.yml`), Docker, `.env` and `.ignore` plugins, so Markdown
previews render Mermaid diagrams such as the ERD in
`docs/concept/data-model.md`.

### Run
1. Start Docker
2. `aspire run` or `dotnet run --project ./src/backend/Athlify.AppHost/Athlify.AppHost.csproj`

## Usage

- Open `http://localhost:5095/graphql` to explore the schema in the
  Hot Chocolate GraphQL IDE (for example, `bodyStats`, `addBodyStats`).
- Open the frontend and go to **Body-Stats** to see the measurements, add,
  edit or delete one, and switch the chart between measurements and periods.
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
