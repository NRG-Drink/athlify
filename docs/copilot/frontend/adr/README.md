# Frontend Architecture Decision Records

Architecture Decision Records (ADRs) document significant, difficult-to-reverse
decisions concerning the Athlify frontend. This directory is scoped to the
frontend; backend decisions belong in
[`../../backend/README.md`](../../backend/README.md).

The functional source of truth is
[`../../../concept/CONCEPT.md`](../../../concept/CONCEPT.md). Shared technical
decisions belong in the concept documents and must be
considered before creating a frontend-specific ADR.

## Index

| ADR | Title | Status |
|---|---|---|
| — | No frontend ADRs recorded yet | — |

The repository currently has no independent frontend source code. Do not
retroactively invent framework, routing, state-management or component-library
decisions. Record those choices here when they are actually made.

## When to write an ADR

Create an ADR only when all three conditions apply:

1. The decision is difficult or costly to reverse, such as choosing a
   frontend framework, state-management approach, design system or API
   integration strategy.
2. The reason is not obvious from the code and future contributors would
   otherwise need historical context.
3. There were meaningful alternatives and the trade-off influenced the choice.

Do not create an ADR for ordinary component changes, styling tweaks,
reversible implementation details or requirements already defined in the
functional concept.

## Process

1. Use the next sequential number: `ADR-NNN-short-slug.md`.
2. Start with status `Proposed`.
3. Document context, considered options, decision and consequences.
4. Add the record to the index above.
5. Change the status to `Accepted` only after review by the project team.

Recommended structure:

```markdown
# ADR-NNN: Title

- Status: Proposed
- Date: YYYY-MM-DD

## Context
## Options considered
## Decision
## Consequences
```

## Binding rules

- An accepted ADR constrains future frontend work in the same area.
- Do not silently edit the decision of an accepted ADR. Supersede it with a
  new ADR and link the predecessor.
- If a frontend decision conflicts with the backend API contract or shared
  technical documentation, resolve the conflict explicitly and update the
  relevant documents.
- Never place credentials, access tokens or personal activity data in ADRs.

## Related documentation

- [`../SAD.md`](../SAD.md) — frontend responsibilities and current status
- [`../PRD.md`](../PRD.md) — frontend-relevant product scope
- [`../../../GLOSSARY.md`](../../../GLOSSARY.md) — shared project terminology
- [`../../../concept/CONCEPT.md`](../../../concept/CONCEPT.md) — shared technical decisions
- [`../../backend/adr/README.md`](../../backend/adr/README.md) —
  backend-specific decisions
