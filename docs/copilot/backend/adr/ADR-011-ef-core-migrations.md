# ADR-011: EF Core migrations for the schema; endpoint tests on EF Core InMemory

**Date**: 2026-10-07
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The Body-Stats prototype created its PostgreSQL schema with
`EnsureCreated`, which cannot change an existing database. The domain model
now has about twenty tables, and every later feature (authentication, Strava
synchronization, analytics) will change it. The endpoint tests run on EF Core
InMemory, which does not enforce unique indexes, check constraints or foreign
keys and cannot run migrations.

## Options Considered

### Option 1: Keep `EnsureCreated` and recreate the database on every change

- Pros: No migration files.
- Cons: Every schema change deletes all data; impossible once real data
  exists.

### Option 2: EF Core migrations; tests stay on InMemory

- Pros: Schema changes are versioned and applied at startup; tests stay
  fast and need no Docker.
- Cons: Database constraints (unique indexes, the maintenance-cycle check
  constraint, `SET NULL`) are not covered by automated tests, so the rules
  must also be checked in application code.

### Option 3: EF Core migrations; tests on PostgreSQL with Testcontainers

- Pros: Tests cover the real constraints and migrations.
- Cons: Every test run needs Docker and is slower.

## Decision

**Chosen**: Option 2 — EF Core migrations, tests on InMemory.

The API applies pending migrations at startup (`MigrateAsync`) when the
provider is relational; tests use `EnsureCreated` on InMemory. Every rule is
enforced in application code before saving, so the endpoint tests cover it;
the database constraints are a second line of defence.

## Consequences

### Positive

- Schema changes no longer destroy data.
- The fast test loop without Docker is kept.

### Negative / Trade-offs

- Constraint and migration behavior is verified manually against PostgreSQL
  (`dotnet ef migrations script`, a run on a fresh database).
- `ExecuteUpdate` and `ExecuteDelete` cannot be used, because InMemory does
  not support them; dependents are loaded and changed explicitly.
- A database created by the prototype's `EnsureCreated` must be deleted once.

## Implementation Notes

- Migrations live in `src/backend/Athlify.Api/Database/Migrations/`; create
  them with `dotnet ef migrations add <Name> --project Athlify.Api
  --output-dir Database/Migrations` from `src/backend/` (the `dotnet-ef` tool
  is pinned in `src/backend/dotnet-tools.json`; run `dotnet tool restore`
  first).
- `Database/DesignTimeDbContextFactory.cs` lets `dotnet ef` build the model
  without the Aspire connection string.
- Until the first release, the history may be squashed into
  `InitialDomainModel`; after that, migrations are only added.
