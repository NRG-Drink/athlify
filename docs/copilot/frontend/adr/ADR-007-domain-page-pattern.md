# ADR-007: Domain pages as feature folders with Relay fragments

**Date**: 2026-10-03
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

Body-Stats is the pilot page: Events, Garage and, with more complexity,
Activities are built the same way. The first version put domain components in
the shared `components/` folder (one of them imported a generated type from the
route), loaded everything in one query without fragments, reloaded the list
after every change, handled loading, empty and error states differently from
`Page`, and formatted dates with the browser's locale instead of the UI
language. Copying that structure would have multiplied the problems. The
GraphQL client had been used since the first prototype but was never recorded
as a decision.

## Options Considered

### Option 1: A generic CRUD page driven by configuration

- Pros: Very little code per new page.
- Cons: Activities (calendar, merge, read-only calculated fields, Strava
  sync) does not fit a table-plus-form shape; the abstraction would be
  rewritten when the third page arrives.

### Option 2: Free-form pages

- Pros: No upfront design.
- Cons: Each page invents its own data loading, states and formatting; fixes
  must be repeated.

### Option 3: Conventions plus a few domain-free building blocks

- Pros: Pages stay free to differ where their domain differs; the repeated
  parts (table, chart, form dialog, confirmation, page states) are written
  once.
- Cons: The conventions must be kept up to date and are enforced only
  partially by tooling.

## Decision

**Chosen**: Option 3 — conventions plus domain-free building blocks, with
Relay confirmed as the GraphQL client.

1. One folder per domain area: `src/features/<area>/`. The route imports only
   `<Area>Page`.
2. `src/components/`, `src/lib/` and `src/relay/` never import from
   `src/features/` (ESLint `no-restricted-imports`). Features do not import
   from each other; shared code moves down.
3. Only `<Area>Page` runs a query, with its `fetchKey` from `useFetchKey()`
   so that a remounted page never replays an old load error. Every component
   that shows domain data declares its own fragment.
4. Mutations live in one `use<Area>Mutations` hook. They update the Relay
   store from the mutation result (`@prependNode` / `@deleteEdge` on the
   page's `@connection`) and never refetch the list. Success and error toasts are raised in that hook.
5. A data page renders `Page` → `QueryBoundary` → content. The boundary maps
   Suspense to a skeleton and a render error to `PageErrorState` with retry;
   an empty list renders `PageEmptyState` with the page's primary action.
6. Columns, chart series and form fields come from a list of metric
   definitions owned by the feature.
7. Numbers, units and dates are formatted only through `useFormat()` in the
   active UI language.
8. The selected view (metric, period) lives in the URL search parameters.

## Consequences

### Positive

- A new area copies one folder and reuses `DataTable`, `MetricChart`,
  `KpiTile`, `PeriodPicker`, `FormDialog`, `ConfirmDialog` and `QueryBoundary`.
- Components own their data needs, so they can be moved and tested alone.
- Large lists do not reload after a change.
- The chart library is replaceable behind `MetricChart`.

### Negative / Trade-offs

- A saved record must contain every field that the page's fragments read, so
  the mutation selects them through one shared fragment that must stay in sync.
- Tests build a real Relay environment with a fetch handler
  (`src/tests/utils/relay.tsx`); `relay-test-utils` is not used.
- Lists are Relay connections with cursor paging from the first page on. A page
  that needs the whole list (Body-Stats: chart and tiles) loads all pages in a
  loop; pages with long lists (Activities) show one page and use
  `usePaginationFragment` with `loadNext` on demand. The server caps a page at
  200 entries (`ModifyPagingOptions`) to stay inside the query cost limits.

## Implementation Notes

- Reference implementation: `src/frontend/athlify/src/features/body-stats/`.
- Shared building blocks: `src/components/` (`DataTable`, `MetricChart`,
  `KpiTile`, `PeriodPicker`, `FormDialog`, `ConfirmDialog`, `QueryBoundary`,
  `Page`), `src/lib/` (`metrics`, `period`, `ticks`), `src/relay/`
  (`environment`), `src/i18n/useFormat.ts`.
- The identifier convention is [ADR-006](../../adr/ADR-006-relay-global-ids.md).
