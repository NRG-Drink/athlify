# ADR-012: Store updates for server-sorted, filtered lists

**Date**: 2026-11-01
**Status**: Proposed
**Deciders**: Marco Ebneter (pending team review)
**Amends**: [ADR-007](ADR-007-domain-page-pattern.md), rule 4

## Context

ADR-007 rule 4 says that mutations update the Relay store from the mutation
result (`@prependNode` / `@deleteEdge`) and never refetch the list. That fits
Body-Stats, where a new entry is newest and the list has no filters.

The Activities list is different. The server sorts it by any column
(`?sort=`), filters it (type, bicycle, tag, wind) and returns `totalCount`
over the whole filtered set. Only the first pages are loaded. A new activity
may belong anywhere in that order, may not match the filters at all, and
changes the count. `@prependNode` would put it at the top, show it under
filters that exclude it, and leave the count wrong.

## Options Considered

### Option 1: Keep rule 4 and insert locally

- Pros: No extra request.
- Cons: The client would have to re-implement the server's sort and filter
  rules, and still cannot know the position of a row beyond the loaded pages.
  The count would drift.

### Option 2: Refetch after every mutation

- Pros: Always correct.
- Cons: Wasteful for update and delete, and an edited row would jump away
  from where the user just edited it.

### Option 3: Choose per mutation kind

- Pros: Correct where only the server knows the answer; no request where the
  store can be updated safely.
- Cons: Two mechanisms on one page.

## Decision

**Chosen**: Option 3. For a list that is sorted and filtered on the server:

- **Create** refetches the list fragment (`network-only`, inside a
  transition so the current rows stay, dimmed) with
  `first = max(page size, loaded rows + 1)`, so the user keeps what they had
  loaded. The page tells the user when the active filters hide the new
  record.
- **Update** relies on the normalized record from the mutation result. The
  row changes in place and does not move, even if it no longer fits the sort
  or filters; the next filter or sort change corrects it.
- **Delete**, and an update that returns `null`, remove the edge from the
  connection (found through the connection's `__id`) and lower `totalCount`.

ADR-007 rule 4 stays as written for lists without server-side sorting and
filters (Body-Stats).

## Consequences

### Positive

- Position, membership and count of a new record are always the server's.
- Edits and deletes cost no extra request.

### Negative / Trade-offs

- Creating costs one list request, at most the size of what was loaded.
- After an edit, a row can sit in a place that does not match the sort until
  the next refresh. This is intended.

## Implementation Notes

- Reference implementation: `src/frontend/athlify/src/features/activities/`
  (`ActivitiesPage.tsx`, `useActivityMutations.ts`).
- Planning record: `.agents/planning/feat-activity-add-edit-delete/02-eng-review.md`.
