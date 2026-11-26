# ADR-013: Grid lists fetch rows outside the Relay store

**Date**: 2026-11-26
**Status**: Proposed
**Deciders**: Frontend team (pending review)
**Amends**: [ADR-007](ADR-007-domain-page-pattern.md), rule 4, and
[ADR-012](ADR-012-store-updates-for-server-sorted-lists.md) (the Body-Stats
exception)

## Context

ADR-007 rule 4 keeps Relay connections up to date from mutation results, and
ADR-012 names Body-Stats as the list that needs no refetch because it has no
filters. Body-Stats now shows its history in an AG Grid with column filters,
multi-column sorting, date range and note filters, saved views and inline
editing, like Events. A row can then leave or enter the filtered, sorted result
after any edit, so the client cannot decide where a record belongs.

Events already feeds its grid through the AG Grid infinite row model and a
cursor datasource (`CursorInfiniteDatasource`) that fetches pages with
`fetchQuery` and the `network-only` policy. Activities, which ADR-012 kept on a
paginated Relay connection, moved to the same mechanism so that all three
grids look and behave alike.

## Options Considered

### Option 1: Keep the Relay connection and map grid state to its arguments

- Pros: One data mechanism for every list; the store stays normalized.
- Cons: The connection is stored per filter and order, so mutations must target
  the right connection id. Grid scrolling, caching and sort changes have to be
  re-implemented on top of `usePaginationFragment`.

### Option 2: Infinite row model with a cursor datasource and `network-only`

- Pros: AG Grid owns paging, caching and sort/filter changes. The server always
  decides membership, position and count. The same datasource serves Events,
  Body-Stats and Activities.
- Cons: Grid rows are plain copies, not store records. After a mutation the
  datasource must be reset.

## Decision

**Chosen**: Option 2. A list that is shown in an AG Grid with column filters
reads its rows through `CursorInfiniteDatasource` with `fetchQuery` and
`network-only`. Mutations keep updating the normalized store for data that other
components read from it, and the grid resets its datasource after a confirmed add,
update or delete.

## Consequences

### Positive

- Position, membership and count of every row come from the server for any
  filter or sort combination.
- Events, Body-Stats and Activities share one datasource and one set of grid
  state helpers.

### Negative / Trade-offs

- A reset reloads the visible blocks after every change.
- The row copies in the grid are not updated by the store; edits go through
  the datasource reset.
- Body-Stats keeps two reads of the same data: the chart query (all matching
  pages) and the grid datasource (filtered pages).
- Activities keep their option lists and the latest activity type in a small
  page query; the rows come from their own `fetchQuery`.

## Implementation Notes

- Activities: `src/frontend/athlify/src/features/activities/`
  (`ActivitiesTable.tsx`, `ActivitiesDataSource.ts`).
