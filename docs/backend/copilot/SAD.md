# Athlify Backend – Software Architecture Document

## Scope

This document describes the technical context for changes to the repository. The functional big picture is in [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md); technical decisions are in [`../../concept/`](../../concept/).

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
- [`../../frontend/copilot/SAD.md`](../../frontend/copilot/SAD.md)
