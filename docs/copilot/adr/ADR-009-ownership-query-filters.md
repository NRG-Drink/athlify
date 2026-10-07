# ADR-009: Ownership enforced by EF Core query filters behind an `ICurrentUser` seam

**Date**: 2026-10-07
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

Every personal record belongs to exactly one user, and every query, mutation
and synchronization must enforce that server-side
([security](../../concept/security.md)). The domain model has more than ten
addressable entities, each reachable through a list, `node(id:)`, mutations
and links from other records (tags, gadgets, bicycles, merges). Real
authentication is not decided yet, but the data model must not be built
without owners and fixed later: every query would change.

## Options Considered

### Option 1: An ownership check in every resolver

- Pros: Explicit at the point of use; no framework feature involved.
- Cons: Dozens of places that must not forget the check, including link
  lookups and `node(id:)`; one omission leaks data.

### Option 2: A repository layer that adds the owner condition

- Pros: One place per entity.
- Cons: An extra abstraction over EF Core and Hot Chocolate's
  `QueryContext` projection; resolvers can still bypass it by using the
  DbContext directly.

### Option 3: Named EF Core global query filters and owner stamping in the DbContext

- Pros: One place for all entities; lists, `node(id:)`, includes,
  projections and link lookups are filtered automatically; a record of
  another user behaves exactly like an unknown id, so nothing leaks.
- Cons: Code that must see other users' records (startup provisioning, the
  future Strava synchronization) has to opt out explicitly; the filter
  depends on a non-pooled DbContext.

## Decision

**Chosen**: Option 3 — named EF Core global query filters and owner stamping.

`AthlifyDbContext` applies the named filter `Owner` to every owned entity and
assigns the signed-in user to new records in `SaveChanges`. The signed-in user
comes from the `ICurrentUser` interface only, so the authentication feature
replaces one adapter without touching resolvers.

## Consequences

### Positive

- Resolvers contain no user condition; ownership cannot be forgotten.
- Linking a record of another user fails like an unknown id
  (`VALIDATION_ERROR` "… not found"); reading or changing one returns `null`.
- The authentication feature only adds a claims-based `ICurrentUser`.

### Negative / Trade-offs

- The DbContext is registered without pooling (`AddDbContext` plus
  `EnrichNpgsqlDbContext`), because a pooled context would keep the user of
  an earlier request.
- Until authentication exists, every request acts as one provisioned
  development Administrator (`DevelopmentCurrentUser`).
- Startup code and the Strava synchronization must call
  `IgnoreQueryFilters(["Owner"])` deliberately.

## Implementation Notes

- Every addressable entity implements `IOwned` and has the `Owner` filter,
  including `MaintenanceCycle`, which stores its owner although it also has a
  parent. Notes (`Comment`) and join tables are reached only through their
  owned parent.
- `ICurrentUser.UserId` throws `NOT_AUTHENTICATED` when nobody is signed in;
  the filter reads it each time a query runs.
- Never ignore all query filters; name the one to ignore
  (`AthlifyDbContext.OwnerFilter`, `AthlifyDbContext.NotDeletedFilter`).
- Tests use `TestCurrentUser`, which reads the user id from the
  `X-Test-User-Id` header, so isolation between two users is tested.
