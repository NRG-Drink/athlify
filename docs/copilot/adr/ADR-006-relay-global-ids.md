# ADR-006: Relay global IDs for all API entities

**Date**: 2026-10-03
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The Body-Stats prototype exposed database integers as `id: Int!`. The Relay
client in the frontend normalizes records by a field named `id` and expects a
string. The page therefore had to select `uid` as the record key and the
integer as an alias (`dbId: id`), and every add or delete reloaded the whole
list because Relay could not tell which record a mutation had changed. Every
future entity (Events, Garage, Activities) would repeat that workaround, and
the identifier shape is part of the API contract, so it is costly to change
once several areas depend on it.

## Options Considered

### Option 1: Keep integer IDs and refetch after every change

- Pros: No backend change.
- Cons: The `dbId` alias workaround on every page; every mutation reloads the
  list, which grows with the data (Activities); no way to update the client
  cache from a mutation result.

### Option 2: Keep integer IDs and write cache updaters by hand

- Pros: No backend change.
- Cons: Each page repeats error-prone updater code keyed by a field Relay does
  not recognize; `node(id:)` refetching is not available.

### Option 3: Hot Chocolate global object identification

- Pros: `id: ID!` is the type-aware opaque string Relay expects; a mutation
  result merges into the cache by itself; `node(id:)` resolves any entity;
  works with the Hot Chocolate version already in use.
- Cons: Breaking change for existing clients; each entity needs `[ID]`
  attributes and a node resolver; IDs encode the type name.

## Decision

**Chosen**: Option 3 — Hot Chocolate global object identification

It removes a workaround that every page would otherwise repeat and makes the
client cache correct by construction. The change is cheapest now, while
Body-Stats is the only entity and nothing else consumes the schema.

## Consequences

### Positive

- Mutations update the client cache from their result; lists change in place.
- One identifier convention for all current and future entities.
- `uid` stays available as a stable external reference if one is needed.

### Negative / Trade-offs

- IDs are opaque: clients and tests must not build or parse them.
- Renaming a GraphQL type invalidates IDs held by clients.
- Filtering by `id` uses the `ID` operation filter, not integer comparison.

## Implementation Notes

- `AddGlobalObjectIdentification()` in `src/backend/Athlify.Api/Program.cs`.
- `[ID]` on the entity `Id`, `[ID<T>]` on arguments, and on a method that
  returns an ID; `[Node(NodeResolverType = …, NodeResolver = …)]` on the
  entity with a static resolver (see `BodyStatsNode.cs`). The attributes live
  in `HotChocolate.Types.Relay`.
- Update, delete and node resolvers return `null` for an unknown ID instead of
  throwing, so clients can treat a vanished record as already gone.
