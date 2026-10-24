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

- **Backend**: a GraphQL API with the domain model — Activities with merges,
  bicycles, gadgets, maintenance cycles, tags, Body-Stats and Events — on
  PostgreSQL with EF Core migrations, plus endpoint tests. Every record
  belongs to a user; until login exists, every request acts as a development
  user. Strava synchronization and Dashboard analyses are not implemented.
- **Frontend**: a React app with light/dark color mode, a German/English
  language switcher and routing. The Activities page lists activities in a
  paged table; type, bicycle, wind and tag filters sit in the column headers
  and live in the URL. The Body-Stats page shows summary tiles, a chart, a
  paged history table and add/edit/delete. Both use the backend API.

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
Docker-in-Docker, Aspire CLI, `dotnet-ef`, and the `gh`, `claude` and
`copilot` CLIs). Open the repository in VS Code and choose
**Reopen in Container**; dependencies are installed and the Relay artifacts
generated automatically. Aspire starts PostgreSQL inside the container; the
host only needs Docker to run the dev container itself. Ports 5095 (API),
5096 (frontend), 15163/17244 (Aspire dashboard) and 5050 (pgweb database UI)
are forwarded to the host. CLI logins (`gh`, `claude`, `copilot`) and the
NuGet/npm caches and the frontend's `node_modules` live in Docker volumes, so
they survive rebuilds and never mix with a `node_modules` on the host
(`docker volume ls`, then `docker volume rm …` to reset). Both editors get the
Copilot, Claude Code and i18n plugins. In WebStorm (JetBrains Gateway) the
container also installs the Markdown, Mermaid, GraphQL (with Relay support via
`graphql.config.yml`), Docker, `.env` and `.ignore` plugins. Mermaid diagrams (for
example the ERD in `docs/concept/data-model.md`) do not render in the
Markdown preview of a dev container session; open the repository folder in a
local WebStorm or view the file on GitHub instead.

### Run
1. Start Docker
2. `aspire run` or `dotnet run --project ./src/backend/Athlify.AppHost/Athlify.AppHost.csproj`

If the API fails at startup with "relation already exists", your database
volume was created before the migrations existed; remove it once with
`docker volume rm athlify-postgres-data` (see
[Configuration](docs/CONFIGURATION.md#database-migrations)).

## Usage

- Open `http://localhost:5095/graphql` to explore the schema in the
  Hot Chocolate GraphQL IDE (for example, `me`, `activities`,
  `createActivity`, `vehicles`, `events`, `bodyStats`).
- Open the frontend and go to **Activities** to browse the list, filter it from
  the column headers and load more rows.
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
