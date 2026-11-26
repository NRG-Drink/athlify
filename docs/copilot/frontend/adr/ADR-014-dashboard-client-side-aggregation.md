# ADR-014: Dashboard aggregates on the client

**Date**: 2026-11-26
**Status**: Proposed
**Deciders**: Frontend team (pending review)

## Context

The Dashboard shows activities, Body-Stats and Events together, grouped by day,
week, month or year, as charts and as a table. The API has no aggregation query:
`activities`, `bodyStats` and `events` are plain filtered connections (shared
[ADR-001](../../adr/ADR-001-graphql-api-contract.md)). The first iteration must
deliver the view without waiting for a backend contract, while staying easy to
move to the server later.

## Options Considered

### Option 1: Aggregation query in the backend

- Pros: One small response, scales to many years of data, one place for the
  week-start and time-zone rules.
- Cons: A new, hard-to-reverse API contract (result types, bucket rules,
  merge and soft-delete handling) before the layout has settled.

### Option 2: Fetch the rows and aggregate in the browser

- Pros: No API change; the view can still change cheaply; the pure functions
  in `lib/aggregate.ts` and `lib/fitness.ts` document the rules a server query
  would have to match.
- Cons: Loads every row of the range (pages of 200, like the Body-Stats chart);
  heavy for long ranges with many activities; the rules live in the client.

## Decision

**Chosen**: Option 2 for the first iteration. The Dashboard loads activities,
Body-Stats and the Events overlapping the range, each with its own `fetchQuery`
loop (`network-only`), so that a changed type or tag filter reloads only the
activities. For the fitness values the activities that carry a TSS in the 126 days
before the range are loaded as well, in parallel. The rows are aggregated in `lib/aggregate.ts` and `lib/fitness.ts`:

- Buckets are local calendar days, ISO weeks (Monday), months and years.
- Activities are summed per bucket; speed is distance divided by time. Body-Stats
  are averaged per bucket.
- Fitness (CTL 42 days, ATL 7 days, TSB = CTL − ATL) is calculated from the daily
  TSS and shown at the last day of each bucket. Without any TSS it is empty.
- Events are drawn on the bucket that contains their start date; events with an end
  date span the buckets up to it.

## Consequences

### Positive

- The backend contract stays open until the Dashboard is stable.
- All rules are pure functions with unit tests.

### Negative / Trade-offs

- Large ranges transfer many rows. The "all" range starts at the first data
  point to avoid empty buckets.
- Merged activities are summed as listed; no merge-specific handling exists.
- A backend aggregation query should supersede this ADR once ranges or data
  volume make the transfer too large.

## Implementation Notes

- `src/frontend/athlify/src/features/dashboard/` (`useDashboardData.ts`,
  `dashboardView.ts`), `src/frontend/athlify/src/lib/aggregate.ts` and
  `src/frontend/athlify/src/lib/fitness.ts`.
