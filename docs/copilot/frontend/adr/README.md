# Frontend Architecture Decision Records

Architecture Decision Records (ADRs) document significant, difficult-to-reverse
decisions concerning the Athlify frontend. This directory is scoped to the
frontend; backend decisions belong in
[`../../backend/adr/README.md`](../../backend/adr/README.md).

The functional source of truth is
[`../../../concept/CONCEPT.md`](../../../concept/CONCEPT.md). Shared technical
decisions belong in the concept documents and must be
considered before creating a frontend-specific ADR.

## Index

| ADR | Title | Status |
|---|---|---|
| [ADR-002](ADR-002-chakra-ui-component-system.md) | Chakra UI v3 as the frontend component system | Proposed |
| [ADR-003](ADR-003-i18next-localization.md) | i18next for the bilingual user interface | Proposed |
| [ADR-004](ADR-004-react-router-data-mode.md) | React Router data mode with a nested app-layout route | Proposed |

The API style is a shared decision; see
[shared ADR-001](../../adr/ADR-001-graphql-api-contract.md). State
management, the GraphQL client and the Tailwind/Chakra coexistence have not
been decided. Record them here once they
are decided.

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

1. Use the next free number across all ADR directories (shared, frontend
   and backend share one sequence): `ADR-NNN-short-slug.md`.
2. Start with status `Proposed`.
3. Document context, considered options, decision and consequences.
4. Add the record to the index above.
5. Change the status to `Accepted` only after review by the project team.

Use the structure from the shared
[ADR template](../../../../.agents/skills/project-docs/references/adr-template.md).

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
