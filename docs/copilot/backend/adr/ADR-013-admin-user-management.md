# ADR-013: Admin user management bypasses the Owner filter for `User` only and checks the role in the database

**Date**: 2026-11-22
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

Administrators must list, create and edit other users' accounts
([US-11](../../../concept/user_stories.md)), but
[ADR-009](../../adr/ADR-009-ownership-query-filters.md) hides every user other
than the signed-in one behind the `Owner` query filter. The role is also a claim
in the access token, which lives for 60 minutes, so a demoted administrator
would keep administrator rights until the token expires. The endpoint tests
authenticate through `ICurrentUser` and do not issue tokens.

## Options Considered

### Option 1: Opt out of the `Owner` filter for `User` in one helper, and read the caller's role from the database

- Pros: One place (`AdminUsers` in `Domain/Users/UserAdminRules.cs`) opts out;
  no other entity is affected, so personal records stay protected. A role
  change applies at once to authorization; the tests exercise the real rule.
- Cons: One extra query per admin request; the opt-out must not spread.

### Option 2: `[Authorize(Roles = Admin)]` on the fields, filter opt-out per resolver

- Pros: Declarative, visible in the schema.
- Cons: Trusts the token role for up to 60 minutes after a demotion; every
  resolver repeats the opt-out; the in-process tests cannot sign tokens.

### Option 3: A second DbContext without filters for administration

- Pros: Strong separation.
- Cons: A second model to keep in sync; the same unfiltered access to all
  tables, which is wider than needed.

## Decision

**Chosen**: Option 1.

`AdminUsers.All(db)` is the only place in user management that ignores the
`Owner` filter for `User`. System flows (login, token refresh, seeding) also
ignore it for `User`, for their own lookups. `AdminUsers.RequireAdminAsync` loads the signed-in user and rejects
non-administrators with `FORBIDDEN`. A role change revokes the target's refresh
tokens (`RoleChanged`), an administrator cannot change their own role, and the
last administrator cannot be demoted.

## Consequences

### Positive

- Administrators cannot read another user's personal records through user
  management: only the `User` entity is unfiltered, and the `User` type has no
  navigation to personal data.
- A demoted administrator loses access immediately; a changed role reaches the
  user's access token after the next refresh.

### Negative / Trade-offs

- The administrator who sets a password knows it (documented in the security
  concept). Forcing a change at first login is a possible follow-up.
- The last-administrator checks (role change and deletion) run in a serializable
  transaction on PostgreSQL
  inside the app's retrying execution strategy, and retries on serialization
  failure (SQLSTATE 40001). The InMemory tests
  ([ADR-011](ADR-011-ef-core-migrations.md)) ignore transactions and the
  strategy, so `UserAdminPostgresTests` cover them against a real server
  (opt-in through `ATHLIFY_TEST_POSTGRES`; see the backend learnings).
- Deleting a user removes their data explicitly through every `IOwned` entity
  instead of relying on the foreign-key cascade, because the InMemory tests
  have no foreign-key actions. A new owned entity is covered automatically;
  data that is not `IOwned` (like the seed markers) must be added to
  `UserDataDeletion`. The deletion is permanent; there is no soft delete or
  undo.
