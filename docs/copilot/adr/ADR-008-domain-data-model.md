# ADR-008: Domain data model: per-user tags, exclusive merges, separate equipment tables

**Date**: 2026-10-04
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The functional concept left several modelling questions open: whether tags
are free text or a managed list, whether an activity may belong to several
merges, and whether Events are linked to activities. Bicycles and gadgets
also carry the same fields, which raises the question of one or two tables.
These choices shape the database schema, the GraphQL types, the Dashboard
filters and the forms in the frontend. Once data exists, changing them needs
a data migration and API changes. The full model is the ERD in
[`data-model.md`](../../concept/data-model.md#entity-relationship-diagram).

## Options Considered

### Tags

#### Option 1: Free-text list on each record

- Pros: Simplest schema and input.
- Cons: Spelling variants split the Dashboard tag filter; renaming a tag means
  editing every record; no autocomplete source.

#### Option 2: Per-user `Tag` entity with n:m links

- Pros: One tag namespace per user shared by Activities, bicycles, gadgets
  and Events; renaming in one place; unique names prevent duplicates; the
  Dashboard filter selects tags by ID.
- Cons: Four join tables; tags need their own create and delete flow.

### Merge membership

#### Option 1: Exclusive membership (`Activity.mergeId`)

- Pros: Merge totals are unambiguous; no double counting on the Dashboard;
  one nullable column instead of a join table.
- Cons: Regrouping an activity requires removing it from its merge first.

#### Option 2: n:m membership

- Pros: An activity can appear in several groupings.
- Cons: Aggregates can count an activity twice; users must understand which
  merge a total belongs to.

### Equipment

#### Option 1: Separate `Vehicle` and `Gadget` tables

- Pros: Matches the concept and the Garage views; vehicle-only data such as
  the Strava gear ID stays on the vehicle; simple foreign keys from
  activities.
- Cons: Duplicated columns; a maintenance cycle needs two nullable foreign
  keys with a check constraint.

#### Option 2: One `Equipment` table with a kind discriminator

- Pros: No duplicated columns; one foreign key for maintenance cycles.
- Cons: Activity→bicycle and Activity→gadget references need kind checks;
  the bicycle–gadget link becomes a self-reference.

## Decision

**Chosen**: per-user `Tag` entity, exclusive merge membership, separate
`Vehicle` and `Gadget` tables. In addition, Events are not linked to
activities (the Dashboard timeline relates them by date) and the user role
is an enum on `User`.

These options keep Dashboard filters and aggregates correct by construction
and follow the concept's wording, at the cost of a few join tables and one
check constraint. They also keep the scope small, which a two-person project
needs.

## Consequences

### Positive

- Tag filters work across all domain areas with stable IDs.
- Merge totals and Dashboard aggregates cannot double count an activity.
- GraphQL types map one-to-one to the Garage views.

### Negative / Trade-offs

- Tags need a management flow (create, rename, delete).
- Moving an activity to another merge is a two-step operation.
- Vehicle and gadget columns are duplicated.

## Implementation Notes

- `Tag` names are unique per user ignoring case (unique
  `(userId, normalizedName)`); join tables only link records of the
  same owner.
- `Activity.mergeId` is nullable; a merge needs at least two activities and is
  dissolved when fewer than two active activities remain.
- `MaintenanceCycle` has exactly one of `vehicleId` and `gadgetId`.
- Join tables are not GraphQL types; they appear as list fields such as
  `Activity.tags` and `Activity.gadgets`.
