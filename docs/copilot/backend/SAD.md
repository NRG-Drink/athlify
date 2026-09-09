# Athlify Backend – Software Architecture Document

**Project**: Athlify
**Last Updated**: 2026-09-09
**Version**: 1.0

## Overview

Athlify's backend is the authoritative service for personal cycling data,
domain calculations, synchronization and the frontend API contract. The
repository currently contains only a small GraphQL prototype.

## Architecture Style

The target architecture is a modular backend with separated domain areas,
data-access boundaries and an API layer. The current implementation is a
technical prototype and does not yet realize the complete target architecture.

## Technology Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| Frontend | React, TypeScript and Vite (planned baseline) | Planned consumer of the backend contract |
| Backend | ASP.NET Core with Hot Chocolate GraphQL 16.4.0 | Current API prototype |
| Database | EF Core InMemory 10.0.9 (prototype) | Fast prototype feedback; final persistence is open |
| Auth | Backend-owned authentication and authorization (planned) | Personal data ownership must be enforced server-side |
| Hosting | Open | Deployment architecture is not yet decided |

## System Components

    Frontend
        |
        v
    Hot Chocolate GraphQL API
        |
        v
    Domain modules and persistence
        |
        +--> Strava synchronization

## Scope

This document describes the technical context for changes to the repository. The functional big picture is in [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md); technical decisions are listed in the concept documents.

## Current repository state

The current source code is a small .NET web prototype:

- Solution: `../../../src/Athlify.slnx`
- Project: `../../../src/GettingStarted/GettingStarted.csproj`
- Target framework: `net10.0`
- Nullable reference types and implicit usings are enabled.
- GraphQL is provided with Hot Chocolate 16.4.0.
- Entity Framework Core 10.0.9 with an in-memory database is used.
- Filtering, sorting, mutation conventions and paging are registered.
- `Program.cs` seeds `TestDb` at startup and maps the GraphQL endpoint.

The product modules from the PRD are not yet fully present in the current code. No change may present a prototype state as a completed product architecture.

## Backend responsibility

The backend is authoritative for authentication, authorization, ownership checks, persistence, domain calculations, Strava synchronization and the API/GraphQL contract. The frontend must not replace these rules.

## Target architecture

The application should grow into clearly separated domain areas:

1. Authentication and user assignment
2. Activities and Strava synchronization
3. Dashboard and analyses
4. Garage with bicycles and gadgets
5. Body-Stats
6. Events

Each area should separate domain logic, data access and presentation so that personal data is protected by the user context. The concrete folder structure and API design will be defined with each feature; do not introduce unjustified abstractions in advance.

## Key Components

### GraphQL API

- **Responsibility**: Expose validated queries and mutations for frontend
  consumers.
- **Interfaces**: Hot Chocolate schema and resolver contract.
- **Data ownership**: No independent ownership; delegates to domain and
  persistence boundaries.

### Domain modules

- **Responsibility**: Enforce ownership, calculations, synchronization and
  domain invariants for Activities, Dashboard, Garage, Body-Stats and Events.
- **Interfaces**: Explicit application services or resolvers as the contract
  becomes concrete.
- **Data ownership**: Personal domain records belong to one user context.

### Persistence

- **Responsibility**: Store domain records and synchronization state.
- **Interfaces**: Repository or ORM boundary selected with the final
  persistence decision.
- **Data ownership**: Durable personal records and external identifiers.

## Data rules

- Every personal entity has a unique owner.
- Queries, mutations and synchronizations must respect the owner context.
- Activities distinguish between manual and synchronized data.
- Calculated values such as average speed and TSS are not treated as freely editable inputs.
- Deleted synchronized Activities must not be unexpectedly reactivated by a later sync.
- Gadgets can be assigned to multiple Activities; a bicycle is optionally assigned to an Activity.
- Merges retain the original Activities traceably.

## API contract

The contract must define clear queries/mutations, input validation, return data and error cases for Activities, Dashboard, Garage, Body-Stats and Events. Schema or DTO changes are reconciled with the frontend Copilot context and the technical documents under `../../concept/`.

## Integration boundaries

Strava is an external source. Synchronization must explicitly handle duplicate, update, deletion and error cases. External IDs must not be confused with internal IDs. Credentials or tokens do not belong in source code, documentation, fixtures or logs.

## Data Flow

Authenticated frontend requests enter through the GraphQL API, are checked
against the logged-in owner context, and are handled by the relevant domain
module and persistence boundary. Strava data enters through synchronization,
where external identifiers, duplicate handling, updates, deletions and errors
are reconciled before records are exposed to the frontend.

## External Integrations

| Service | Purpose | Authentication |
| ------- | ------- | -------------- |
| Strava | Import and update cycling activities | Backend-managed OAuth/token flow |

## Scalability

- Current capacity: Small in-memory prototype with seeded test data.
- Scaling strategy: Select persistence and deployment scaling after the open
  architecture decisions are resolved.
- Known bottlenecks: In-memory persistence and prototype-only domain coverage.

## Development guardrails

- Before code changes, inspect existing types, resolvers and data models.
- Do not manually store states already managed by EF Core or Hot Chocolate without justification.
- Do not duplicate domain rules in UI-specific resolvers.
- Handle errors explicitly and clearly for users; do not use silent fallbacks.
- Keep changes to the schema or data model synchronized with affected tests and documents.
- Use the smallest existing build or test command that covers the change.

## Security model

Authentication is required for personal areas. Authorization is not only a UI concern: every server-side query and mutation must check the user reference. Administration is optional and must not implicitly grant normal users access to personal data.

## Technical detail sources

- [`../../concept/technology-stack.md`](../../concept/technology-stack.md)
- [`../../concept/architecture.md`](../../concept/architecture.md)
- [`../../concept/data-model.md`](../../concept/data-model.md)
- [`../../concept/api-design.md`](../../concept/api-design.md)
- [`../../concept/activity-management.md`](../../concept/activity-management.md)
- [`../../concept/security.md`](../../concept/security.md)
- [`../../concept/testing-deployment.md`](../../concept/testing-deployment.md)
- [`../frontend/SAD.md`](../frontend/SAD.md)

## ADR References

See [`../adr/README.md`](../adr/README.md) for backend and shared decision
records.
