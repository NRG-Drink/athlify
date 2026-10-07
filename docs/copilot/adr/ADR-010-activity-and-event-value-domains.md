# ADR-010: Fixed value domains for mood, effort, wind and Event type

**Date**: 2026-10-07
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The concept left open which values `mood`, `effort` and `wind` of an activity
may take, and which Event types exist (an
[open question](../../concept/CONCEPT.md#12-open-questions) until this
decision). The database schema, the GraphQL input types and the frontend
forms all depend on these values. Leaving them as free text would need a data migration and an API
change once they are fixed, and free text cannot be filtered or charted
reliably on the Dashboard.

## Options Considered

### Option 1: Free text or unchecked numbers, decided later

- Pros: No decision now.
- Cons: Inconsistent values that the Dashboard cannot group; a later data
  migration and breaking API change.

### Option 2: Fixed enums and a bounded number, stored as strings

- Pros: Forms get a fixed choice; the API rejects invalid values; the
  Dashboard can group and filter them; string storage keeps the database
  readable and lets new values be added without rewriting data.
- Cons: Removing or renaming a value needs a migration and an API change.

### Option 3: User-defined value lists per user

- Pros: Most flexible.
- Cons: Extra management screens and no shared meaning for analysis; out of
  proportion for a two-person project.

## Decision

**Chosen**: Option 2 — fixed enums and a bounded number.

- `effort`: integer from 1 to 10, optional.
- `mood`: `VeryBad`, `Bad`, `Neutral`, `Good`, `VeryGood`, optional.
- `wind`: `Calm`, `Light`, `Moderate`, `Strong`, `Stormy`, optional.
- Event `type`: `Crash`, `Injury`, `Illness`, `Repair`, `Break`, `Goal`,
  `Other`, required.

All enums are stored as strings in PostgreSQL. The GraphQL schema exposes them
as enums in upper snake case (for example `VERY_GOOD`).

## Consequences

### Positive

- The Activities and Events forms can offer fixed choices with translated
  labels.
- Invalid values are rejected by the GraphQL schema or with
  `VALIDATION_ERROR`.

### Negative / Trade-offs

- A new value needs a code change and a schema export; removing one needs a
  data migration.
- `Other` covers Events that fit no type.

## Implementation Notes

- The enums are `Mood`, `Wind` and `ActivityType` in
  `src/backend/Athlify.Api/Domain/Activities/ActivityEnums.cs`, and `EventType`
  in `Domain/Events/Event.cs`.
- `AthlifyDbContext.ConfigureConventions` stores every enum as a string.
- UI labels belong in the i18next locale files; the API values are never
  shown directly.
