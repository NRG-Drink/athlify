# Athlify

## Table of Contents

- [Overview & Features](#overview--features)
- [Tech Stack & Sources](#tech-stack--sources)
- [Documentation](#documentation)
- [Getting Started & Installation](#getting-started--installation)
- [Usage](#usage)
- [AI Documentation](#ai-documentation)
- [Contributing](#contributing)
- [Issues](#issues)
- [License](#license)

## Overview & Features

Athlify is a self-hosted web application for cyclists. It is intended to
import activities from Strava, support manual activity management and provide
personal analysis of training, bicycles, body data and relevant events.

The functional scope is defined in the
[software concept](docs/concept/CONCEPT.md). The current repository contains a
small backend prototype; the complete product is not implemented yet.

## Tech Stack & Sources

The current prototype is a .NET 10 web application using ASP.NET Core,
Hot Chocolate GraphQL 16 and Entity Framework Core with an in-memory database.
The planned product architecture and technology direction are documented in
the [concept technical documents](docs/concept/technology-stack.md).

Additional implementation context is available in the
[frontend Copilot documentation](docs/copilot/frontend/README.md) and
[backend Copilot documentation](docs/copilot/backend/README.md).

## Documentation

The [documentation hub](docs/README.md) puts user-relevant product,
requirements and technical documents first. AI-assisted implementation
guidance is collected in the [Copilot documentation index](docs/copilot/README.md).

## Getting Started & Installation

### Prerequisites

- .NET 10 SDK

### Run the prototype

```bash
dotnet run --project src/GettingStarted/GettingStarted.csproj
```

The application exposes the GraphQL endpoint configured by the ASP.NET Core
project. See `src/GettingStarted/Properties/launchSettings.json` for local
development URLs.

## Usage

Use the prototype to explore the current GraphQL getting-started surface. Do
not treat it as the completed Athlify product; product requirements and
acceptance criteria remain in the
[software concept](docs/concept/CONCEPT.md).

## AI Documentation

The repository-local [AI documentation index](docs/copilot/README.md)
explains source authority, frontend/backend boundaries, architecture
decisions and evidence-backed learnings.

## Contributing

This is a private GitHub-hosted student project. Coordinate changes with the
project team, keep the functional concept and related technical documents
synchronized, and follow the repository guidance in
[AGENTS.md](AGENTS.md).

## Issues

Report defects and propose changes through the repository's private GitHub
issue and pull-request workflow.

## License

This repository does not currently declare an open-source license. All rights
are reserved unless the project owners provide separate permission.
