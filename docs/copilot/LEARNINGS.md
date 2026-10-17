# Athlify – Shared Copilot Learnings

This file records durable cross-cutting decisions that affect more than one
implementation area. Area-specific implementation knowledge remains in
`frontend/LEARNINGS.md` and `backend/LEARNINGS.md`.

## Entries

- 2026-10-17 - `cross-cutting` `planned` The first Activities slice uses the existing owner-scoped GraphQL `activities` connection with Relay cursor pagination and URL-owned filters; it does not add a backend query or fetch the full history. Why: This preserves backend authority and keeps the list module reversible for later detail, calendar, merge and synchronization features. Evidence: `.agents/planning/feat-list-activities/02-eng-review.md`, `docs/concept/api-design.md`, `docs/copilot/frontend/adr/ADR-007-domain-page-pattern.md`.
