# Athlify Backend – Copilot Learnings

This file records durable, evidence-backed backend knowledge. It is not a
second product specification. Planned behavior belongs in the concept and
PRD; implemented behavior is confirmed against source code and tests.

## Entry format

Every active entry contains:

- **Status**: `verified`, `durable-rule`, `pitfall`, `procedure`, `open` or
  `superseded`
- **Scope**: `frontend`, `backend` or `cross-cutting`
- **Rule**: one precise statement
- **Why it matters**: the future decision or failure it prevents
- **Evidence**: file, line, command, test or ADR
- **Recorded**: date of confirmation

## Durable rules

### The backend owns personal-data integrity

- **Status**: durable-rule
- **Scope**: backend
- **Rule**: Authentication, authorization, ownership checks, persistence,
  calculations, synchronization and the API contract are backend
  responsibilities.
- **Why it matters**: Client-side checks cannot protect personal data or
  provide a reliable source for calculated values.
- **Evidence**: [`SAD.md`](SAD.md), [`../../concept/security.md`](../../concept/security.md)
- **Recorded**: 2026-09-08

### The current source is a prototype, not the product

- **Status**: durable-rule
- **Scope**: backend
- **Rule**: `src/GettingStarted` is a small Hot Chocolate GraphQL prototype
  with book/author examples and must not be presented as implemented Athlify
  functionality.
- **Why it matters**: Product requirements and prototype implementation have
  different authority and must not be silently conflated.
- **Evidence**: [`SAD.md`](SAD.md), [`../../../src/GettingStarted/Query.cs`](../../../src/GettingStarted/Query.cs), [`../../../src/GettingStarted/TestDb.cs`](../../../src/GettingStarted/TestDb.cs)
- **Recorded**: 2026-09-08

### Personal records require an owner context

- **Status**: durable-rule
- **Scope**: cross-cutting
- **Rule**: Every personal query, mutation and synchronization must enforce
  the logged-in user's ownership context server-side.
- **Why it matters**: UI filtering is not an authorization boundary.
- **Evidence**: [`SAD.md`](SAD.md), [`../../concept/security.md`](../../concept/security.md)
- **Recorded**: 2026-09-08

### Synchronization must preserve deletion and idempotency rules

- **Status**: durable-rule
- **Scope**: backend
- **Rule**: Strava synchronization distinguishes internal and external IDs,
  avoids duplicate records, handles errors explicitly, and does not
  reactivate soft-deleted activities.
- **Why it matters**: Repeated imports must not corrupt a user's history or
  undo an intentional deletion.
- **Evidence**: [`../../concept/activity-management.md`](../../concept/activity-management.md), [`../../concept/api-design.md`](../../concept/api-design.md)
- **Recorded**: 2026-09-08

## Verified implementation findings

### Prototype GraphQL configuration

- **Status**: verified
- **Scope**: backend
- **Rule**: The prototype targets `net10.0`, uses nullable reference types and
  implicit usings, registers Hot Chocolate 16.4.0, EF Core InMemory 10.0.9,
  filtering, sorting, mutation conventions and paging.
- **Why it matters**: Changes to the prototype must respect its actual
  dependency and runtime surface.
- **Evidence**: [`../../../src/GettingStarted/GettingStarted.csproj`](../../../src/GettingStarted/GettingStarted.csproj), [`../../../src/GettingStarted/Program.cs`](../../../src/GettingStarted/Program.cs)
- **Recorded**: 2026-09-08

### Prototype paging defaults

- **Status**: verified
- **Scope**: backend
- **Rule**: The prototype configures a default page size of 10, includes total
  counts and allows a maximum page size of 999.
- **Why it matters**: Consumers and tests must not assume unbounded or
  server-default paging.
- **Evidence**: [`../../../src/GettingStarted/Program.cs`](../../../src/GettingStarted/Program.cs)
- **Recorded**: 2026-09-08

## Procedures

### Documentation validation

- **Status**: procedure
- **Scope**: cross-cutting
- **Rule**: Documentation changes are checked with `git diff --check` and
  changed relative Markdown links are validated from their containing file.
- **Why it matters**: Broken context links directly reduce agent reliability.
- **Evidence**: [`../../../AGENTS.md`](../../../AGENTS.md)
- **Recorded**: 2026-09-08

### Repository-local documentation is canonical

- **Status**: durable-rule
- **Scope**: cross-cutting
- **Rule**: Repository documentation is loaded from `docs/`; frontend,
  backend and shared AI context must not rely on a second missing external
  documentation root.
- **Why it matters**: A stale external path makes authoritative context
  unavailable and can cause agents to work from incomplete or duplicated
  documentation.
- **Evidence**: [`../README.md`](../README.md),
  repository `docs/` tree
- **Recorded**: 2026-09-08

## Open items

### AI context is separate from user documentation

- **Status**: durable-rule
- **Scope**: cross-cutting
- **Rule**: User-facing product documentation remains directly under `docs/`,
  while all AI implementation context is organized below `docs/copilot/`.
- **Why it matters**: Contributors can find product scope without navigating
  agent-specific files, while AI work still has a single implementation entry
  point.
- **Evidence**: [`../../README.md`](../../README.md),
  [`../README.md`](../README.md)
- **Recorded**: 2026-09-08

### Product persistence and authentication architecture

- **Status**: open
- **Scope**: backend
- **Question**: What final persistence, authentication and deployment
  architecture will replace the prototype choices?
- **Why it matters**: These are difficult-to-reverse decisions that affect
  every domain module and the frontend contract.
- **Evidence**: [`SAD.md`](SAD.md), [`../../concept/technology-stack.md`](../../concept/technology-stack.md)
- **Recorded**: 2026-09-08
- **Closure**: Review alternatives and record an accepted shared or backend ADR.

### Domain calculations and mappings

- **Status**: open
- **Scope**: backend
- **Question**: How are missing-data TSS, Indoor/Outdoor mapping, free versus
  managed tags, and merge membership defined?
- **Why it matters**: These rules determine data shape, validation and
  synchronization behavior.
- **Evidence**: [`PRD.md`](PRD.md), [`../../concept/activity-management.md`](../../concept/activity-management.md)
- **Recorded**: 2026-09-08
- **Closure**: Resolve the domain decision in the concept and API contract.
