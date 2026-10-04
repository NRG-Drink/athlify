# ADR-001: GraphQL as the frontend/backend API contract

**Date**: 2026-09-23
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The original [API design](../../concept/api-design.md) described a REST/JSON
API. The backend prototype in `src/backend/Athlify.Api/` was then built with
Hot Chocolate GraphQL 16, including Body-Stats queries, mutations, filtering,
sorting and projections, and its endpoint tests exercise the `/graphql`
endpoint. The API style shapes every frontend data call, the backend resolver
structure, error handling and test strategy, so it is costly to change once
domain features are built on it.

## Options Considered

### Option 1: REST/JSON endpoints per domain module

- Pros: Widely known, simple HTTP caching, straightforward tooling.
- Cons: Dashboard views need data from several modules, leading to multiple
  round trips or bespoke aggregate endpoints; filtering and sorting must be
  designed per endpoint.

### Option 2: GraphQL with Hot Chocolate

- Pros: One typed schema for all domain modules; clients select exactly the
  fields a view needs; filtering, sorting and projections come from Hot
  Chocolate conventions; already implemented and tested in the prototype.
- Cons: Authorization must be enforced per resolver and field; query cost
  must be limited; errors are returned in the GraphQL `errors` array rather
  than through HTTP status codes.

## Decision

**Chosen**: Option 2 — GraphQL with Hot Chocolate

The Dashboard combines Activities, Body-Stats and Events with shared filters,
which suits a single typed schema with client-selected fields. The prototype
and its tests already use this contract, so continuing avoids rework.

## Consequences

### Positive

- One schema is the seam between frontend and backend.
- Filtering and sorting follow a single convention across modules.

### Negative / Trade-offs

- Ownership checks must be applied in every resolver; UI filters never
  replace them.
- Clients must inspect the GraphQL `errors` array to distinguish failures
  from empty results.
- The Strava OAuth callback may still require a plain HTTP endpoint outside
  the GraphQL schema.

## Implementation Notes

- The endpoint is mapped at `/graphql` in `src/backend/Athlify.Api/Program.cs`.
- Queries and mutations are declared with `[QueryType]` / `[MutationType]`
  static partial classes and registered through the generated `AddTypes()`.
- The frontend GraphQL client library is not yet chosen.
