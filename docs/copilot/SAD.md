# Athlify — Software Architecture Document

**Project**: Athlify  
**Last Updated**: 2026-09-23
**Version**: 1.0

## Overview

Athlify is planned as a web application with a bilingual frontend, a backend
API, persistent personal data and a Strava integration. The current repository
contains a small ASP.NET Core, Hot Chocolate GraphQL and EF Core InMemory
backend prototype (`src/backend/`) and a React/TypeScript frontend app shell
(`src/frontend/athlify/`) that are not yet connected. Planned architecture must
not be presented as implemented behavior.

This document is the canonical architecture entry point for the configured
documentation root.

## Architecture Style

The target is a modular application with separated frontend views, backend
domain areas, persistence and integration boundaries. The current prototype
does not yet realize the complete target architecture.

## System Components

```mermaid
flowchart LR
    FE[Frontend] --> API[Backend API / GraphQL]
    API --> DOMAIN[Domain modules]
    DOMAIN --> DB[(Persistence)]
    DOMAIN --> STRAVA[Strava API]
```

## Technology Stack

| Layer | Technology | Status |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite | App shell |
| UI components | Chakra UI v3 ([ADR-002](frontend/adr/ADR-002-chakra-ui-component-system.md)) | Proposed |
| Localization | i18next ([ADR-003](frontend/adr/ADR-003-i18next-localization.md)) | Proposed |
| API contract | GraphQL via Hot Chocolate ([ADR-001](adr/ADR-001-graphql-api-contract.md)) | Proposed; prototype |
| Backend | ASP.NET Core (.NET 10) | Prototype |
| Database | PostgreSQL | Planned target |
| Prototype persistence | EF Core InMemory | Current prototype |
| Tests | TUnit (backend); frontend test runner not chosen | Backend prototype |
| Authentication | Backend-owned authentication and authorization | Planned |
| External integration | Strava API through backend synchronization | Planned |

See the [technology stack](../concept/technology-stack.md) and the
[backend SAD](backend/SAD.md) for detail.

## Key Components

### Frontend

Presents navigation, forms, views, filters, charts, local UI states and
accessible feedback. It does not own persistence, authorization or domain
calculations.

### Backend API

Exposes the frontend contract, validates requests, enforces authentication
and ownership, and delegates to domain modules and persistence.

### Domain Modules

The planned modules cover authentication and user assignment, Administrator
user management, Activities and Strava synchronization, Dashboard analysis,
Garage, Body-Stats and Events. Administrators retain the complete personal
user experience.

### Persistence and Integration Boundaries

Persistence owns durable personal records and synchronization state. Strava
is an external source whose identifiers, updates, duplicate handling and
deletion behavior must be reconciled by the backend.

## Data Flow

Authenticated frontend requests enter through the backend API, are checked
against the logged-in owner context, and are handled by the relevant domain
module and persistence boundary. Strava data enters through synchronization
before it is exposed to the frontend.

## External Integrations

| Service | Purpose | Authentication |
| ------- | ------- | -------------- |
| Strava | Import and update cycling activities through backend synchronization | Backend-managed OAuth/token flow |

## Security Model

- Authentication is required for personal areas.
- Administrators have all regular-user permissions in addition to
  Administrator-only user management.
- Every server-side query and mutation enforces the owner context.
- Frontend filters never replace backend authorization.
- Credentials and tokens do not belong in source code, documentation,
  fixtures or logs.

See the [security concept](../concept/security.md) and
[backend SAD](backend/SAD.md).

## Scalability

- Current capacity: in-memory backend prototype with seeded sample data; the
  frontend does not call the backend yet.
- Scaling strategy: self-hosted for individual users. Persistence and
  deployment scaling are decided together with the planned PostgreSQL and
  Docker Compose setup ([testing and deployment](../concept/testing-deployment.md)).
- Known bottlenecks: in-memory persistence and Strava API rate limits.

## Detailed Architecture

- [Architecture overview](../concept/architecture.md)
- [Data model](../concept/data-model.md)
- [API design](../concept/api-design.md)
- [Activity management and synchronization](../concept/activity-management.md)
- [Frontend architecture](frontend/SAD.md)
- [Backend architecture](backend/SAD.md)

## ADR References

Cross-cutting decisions are indexed in
[`adr/README.md`](adr/README.md), currently
[ADR-001: GraphQL as the frontend/backend API contract](adr/ADR-001-graphql-api-contract.md). Frontend- and backend-specific decisions
are indexed from the respective Copilot documentation.
