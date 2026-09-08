# Shared Architecture Decision Records

This directory contains accepted or proposed architecture decisions that
cross the frontend/backend boundary. Decisions specific to one area remain in
the relevant [`frontend ADRs`](../frontend/adr/README.md) or
[`backend ADRs`](../backend/adr/README.md).

## When to create an ADR

Create a shared ADR only when all of these conditions apply:

1. The decision is difficult or costly to reverse.
2. Meaningful alternatives were considered.
3. The decision affects both frontend and backend, or a shared contract,
   domain model, security rule or deployment boundary.

Do not create an ADR for routine documentation edits, straightforward
validation, or requirements already defined by the concept.

## Lifecycle

- New records start as `Proposed`.
- An `Accepted` ADR constrains future work.
- Never silently rewrite an accepted decision.
- Supersede an accepted decision with a new numbered ADR and link both
  records.
- Keep credentials, tokens and personal activity data out of ADRs.

## Naming and template

Use `ADR-NNN-short-slug.md` with sequential zero-padded numbers. Each record
should contain context, options considered, decision, consequences and
implementation notes. The first shared decision should add the repository's
standard template when it is actually needed; this index intentionally does
not invent a placeholder decision.

## Related context

- [`../README.md`](../README.md) — AI documentation hierarchy
- [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md) — functional source of truth
- [`../frontend/adr/README.md`](../frontend/adr/README.md) —
  frontend-specific decisions
- [`../backend/adr/README.md`](../backend/adr/README.md) —
  backend-specific decisions
