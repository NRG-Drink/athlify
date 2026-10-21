# Athlify – Shared Copilot Learnings

This file records durable cross-cutting decisions that affect more than one
implementation area. Area-specific implementation knowledge remains in
`frontend/LEARNINGS.md` and `backend/LEARNINGS.md`.

## Entries

- 2026-10-17 - `cross-cutting` `planned` The first Activities slice uses the existing owner-scoped GraphQL `activities` connection with Relay cursor pagination and URL-owned filters; it does not add a backend query or fetch the full history. Why: This preserves backend authority and keeps the list module reversible for later detail, calendar, merge and synchronization features. Evidence: `.agents/planning/feat-list-activities/02-eng-review.md`, `docs/concept/api-design.md`, `docs/copilot/frontend/adr/ADR-007-domain-page-pattern.md`.
- 2026-10-21 - `frontend` `planned` Body-Stats chart ranges use inclusive local ISO dates in URL parameters (`from`/`to`), while Relay reuses the in-memory normalized history during the session. Why: Date-only URLs avoid UTC boundary shifts, and the existing full-history page can derive arbitrary ranges without duplicate requests. Evidence: `.agents/planning/feat-list-activities/02-eng-review.md`, `src/frontend/athlify/src/features/body-stats/BodyStatsPage.tsx`, `src/frontend/athlify/src/lib/period.ts`.
- 2026-10-21 - `frontend` `planned` Body-Stats chart aggregation is chart-only: use the latest real measurement per local calendar bucket (`day`, `week`, `month`, `year`), while KPI deltas and the history table remain based on raw measurements. Why: Snapshot metrics should not be averaged or fabricated, and changing visual resolution must not silently change headline values. Evidence: `.agents/planning/feat-list-activities/01-ceo-review.md`, `.agents/planning/feat-list-activities/02-eng-review.md`.
