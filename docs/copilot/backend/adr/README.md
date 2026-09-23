# Backend Architecture Decision Records

Architecture Decision Records (ADRs) document significant, difficult-to-reverse
decisions concerning the Athlify backend. This directory is scoped to the
backend; frontend decisions belong in
[`../../frontend/adr/README.md`](../../frontend/adr/README.md).

The functional source of truth is
[`../../../concept/CONCEPT.md`](../../../concept/CONCEPT.md). Shared technical
decisions belong in the concept documents and must be
considered before creating a backend-specific ADR.

## Index

| ADR | Title | Status |
|---|---|---|
| — | No backend-specific ADRs recorded yet | — |

The API style is a shared decision; see
[shared ADR-001](../../adr/ADR-001-graphql-api-contract.md). The backend
prototype is under `src/backend/Athlify.Api/`. An implementation detail there
(for example EF Core InMemory) is not an accepted architectural decision until
it is recorded here.

## When to write an ADR

Create an ADR only when all three conditions apply:

1. The decision is difficult or costly to reverse, such as a persistence
   strategy, authentication model, API/GraphQL contract, external integration
   boundary or deployment choice.
2. The reason is not obvious from the code and future contributors would
   otherwise need historical context.
3. There were meaningful alternatives and the trade-off influenced the choice.

Do not create an ADR for ordinary resolver changes, straightforward validation,
routine migrations or requirements already defined in the functional concept.
Those belong in the code, `AGENTS.md`, `SAD.md` or the technical concept
documents.

## Process

1. Use the next free number across all ADR directories (shared, frontend
   and backend share one sequence): `ADR-NNN-short-slug.md`.
2. Start with status `Proposed`.
3. Document context, considered options, decision and consequences.
4. Add the record to the index above.
5. Change the status to `Accepted` only after review by the project team.

Use the structure from the shared
[ADR template](../../../../.agents/skills/project-docs/references/adr-template.md).

## Binding rules

- An accepted ADR constrains future backend work in the same area.
- Do not silently edit the decision of an accepted ADR. Supersede it with a
  new ADR and link the predecessor.
- Changes to the API/GraphQL contract, data model, authentication or
  synchronization behaviour must be checked against the frontend context and
  shared technical documentation.
- The backend remains authoritative for authorization, ownership checks,
  persistence, calculated values and Strava synchronization.
- Never place credentials, access tokens or personal activity data in ADRs.

## Related documentation

- [`../SAD.md`](../SAD.md) — backend responsibilities and current status
- [`../PRD.md`](../PRD.md) — backend-relevant product scope
- [`../../../GLOSSARY.md`](../../../GLOSSARY.md) — shared project terminology
- [`../../../concept/CONCEPT.md`](../../../concept/CONCEPT.md) — shared technical decisions
- [`../../frontend/adr/README.md`](../../frontend/adr/README.md) —
  frontend-specific decisions
