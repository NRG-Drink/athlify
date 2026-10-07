# Athlify – API Design

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

The API is a GraphQL schema served by Hot Chocolate at `/graphql` (proposed
in [ADR-001](../copilot/adr/ADR-001-graphql-api-contract.md), which replaces
the earlier REST plan). Queries and mutations are organized around the domain
modules. The Strava OAuth callback may still need a plain HTTP endpoint.

The backend implements the domain areas marked as implemented below.
Authentication, Strava synchronization and the Dashboard analyses are still
planned. The backend must remain authoritative for validation, calculated
values, synchronization and ownership; the frontend must not infer or replace
those rules.

| Area | Queries and mutations | State |
|---|---|---|
| Auth | Registration, login, logout and token renewal | Planned |
| User | Own profile (`me`); Administrator-only user administration | `me` implemented |
| Strava | Connect, disconnect, status and synchronization | Planned (table only) |
| Activities | List, view, create, edit, delete, merge and synchronize | Implemented except synchronization |
| Vehicles | List, create, edit, delete and synchronize | Implemented except synchronization |
| Gadgets and maintenance cycles | List, create, edit and delete | Implemented |
| Tags | List, create, rename and delete | Implemented |
| Body-Stats | List, create, edit and delete | Implemented |
| Events | List, create, edit and delete | Implemented |
| Dashboard | Metrics, charts and analyses | Planned |

All personal endpoints verify authentication and ownership of the requested
data server-side. Errors are returned explicitly in the GraphQL `errors` array so
clients can distinguish validation, authorization, synchronization and
infrastructure failures from successful empty results.

## Conventions

Every domain area follows the Body-Stats pattern described below.

- **Identity.** Every entity implements `Node`; `id` is an opaque global ID
  ([ADR-006](../copilot/adr/ADR-006-relay-global-ids.md)) and `node(id:)`
  resolves it.
- **Lists.** Lists are Relay connections (`first`/`after`, at most 200 per
  page, default 100) with `where` filtering and `order` sorting. Filters on
  linked records take global IDs, for example
  `activities(where: { vehicle: { id: { eq: $bike } }, tags: { some: { id: { eq: $tag } } } })`.
- **Inputs.** Create and update take an `…Input`. Identity, owner,
  timestamps, `source`, Strava IDs and calculated values are never input.
  Link lists such as `tagIds`, `gadgetIds` and `vehicleIds` are required and
  replace the complete set; send `[]` for none.
- **Results.** Create returns the new record; update returns the record, or
  `null` if it does not exist; delete returns the deleted `id`, or `null`.
  Nested selections in mutation results are loaded like in the lists.
- **Ownership.** Every operation acts on the signed-in user's records
  ([ADR-009](../copilot/adr/ADR-009-ownership-query-filters.md)). Another
  user's record behaves exactly like an unknown id: reads, updates and
  deletes return `null`, and linking it fails with `VALIDATION_ERROR`.
  Until authentication exists, every request acts as the development user.
- **Errors.** `VALIDATION_ERROR` lists every invalid value of an input at once
  and stores nothing; `NOT_AUTHENTICATED` means that no user is signed in.
- **Cost.** The query cost limits are raised to 10,000 so that a filtered page
  of 200 activities passes; larger nested selections must page.

## Activities and merges

| Operation | Behavior |
|---|---|
| `activities(first, after, where, order)` | Active activities, newest first (ties by `id`). Soft-deleted activities are never returned. |
| `createActivity(activity)` / `updateActivity(id, activity)` | Saves the editable fields with `vehicleId`, `gadgetIds` and `tagIds`; `averageSpeed` is calculated, `source` is `MANUAL` for created activities. Updating a merged activity recalculates the merge totals. |
| `deleteActivity(id)` | Soft delete (`deletedAt`); a merge left with fewer than two active activities is dissolved. |
| `activityMerges(first, after, where, order)` | Merges, newest first, with their active `activities` and stored totals. |
| `createActivityMerge(name, activityIds)` | Merges at least two of the user's active activities that are not merged yet. |
| `renameActivityMerge(id, name)` | Changes the optional name. |
| `addActivityToMerge(mergeId, activityId)` / `removeActivityFromMerge(mergeId, activityId)` | Changes the membership and the totals. Remove returns `null` when the merge was dissolved. An activity in another merge is rejected. |
| `deleteActivityMerge(id)` | Dissolves the merge; its activities remain. |

Activity validation: `time` greater than 0, `distance` and `elevationGain` not
negative, heart rates between 20 and 250 with minimum ≤ average ≤ maximum,
`effort` from 1 to 10, `description` up to 2000 characters, and a `date` no
more than one day in the future. `mood`, `wind` and `type` are enums
([ADR-010](../copilot/adr/ADR-010-activity-and-event-value-domains.md)).
Internal IDs and external Strava IDs are separate references, and the future
synchronization must be idempotent. Calendar data and weekly summaries are
still planned.

## Garage, tags and Events

| Operation | Behavior |
|---|---|
| `vehicles`, `createVehicle`, `updateVehicle`, `deleteVehicle` | Bicycles ordered by brand and model, with `tags`, `gadgets` and `maintenanceCycles`. Deleting a bicycle clears it on its activities (soft-deleted ones included) and deletes its maintenance cycles. |
| `gadgets`, `createGadget`, `updateGadget`, `deleteGadget` | Gadgets ordered by brand and model; `vehicleIds` sets the bicycles the gadget is mounted on. Deleting a gadget removes its links and deletes its maintenance cycles. |
| `createMaintenanceCycle`, `updateMaintenanceCycle`, `deleteMaintenanceCycle` | A cycle has exactly one of `vehicleId` and `gadgetId`, a name and at least one interval greater than 0. Cycles are read through `Vehicle.maintenanceCycles` and `Gadget.maintenanceCycles`. |
| `tags`, `createTag`, `updateTag`, `deleteTag` | Tags ordered by name. Names are trimmed, 1–50 characters and unique per user ignoring case. Deleting a tag removes it from every record. |
| `events`, `createEvent`, `updateEvent`, `deleteEvent` | Events ordered by start date, latest first, with a required `type`, an optional `endDate` not before `startDate` and `tags`. |
| `me` | The signed-in user (email, name, language, role). |

Bicycle and gadget validation: brand and model required (up to 100
characters), price not negative, deactivation date not before the purchase
date.

## Body-Stats

Body-Stats were the first implemented area and define the pattern that the
other domain areas follow. Each entry belongs to the signed-in user.

**Identifiers.** Every `id` is a Relay global ID (an opaque string) following
[ADR-006](../copilot/adr/ADR-006-relay-global-ids.md). Clients never parse or
build it, and `node(id:)` resolves any entity that implements `Node`.

| Operation | Behavior |
|---|---|
| `bodyStats(first, after)` | Relay connection of measurements, newest first (ties by `id`); cursor paging with at most 200 per page (default 100); supports filtering and sorting. |
| `bodyStatsById(id)` | One measurement, or `null`. |
| `addBodyStats(bodyStats)` | Creates a measurement and returns it. |
| `updateBodyStats(id, bodyStats)` | Replaces the measurement values, including the note; returns `null` if the measurement does not exist. |
| `deleteBodyStats(id)` | Deletes the measurement; returns the deleted `id`, or `null` if it did not exist. |

**Input.** `BodyStatsInput` carries `date`, `weight`, `bodyFatPercentage`,
`musclePercentage`, `waterPercentage`, `boneMass` and the optional string
`comment` (the note, at most 2000 characters; longer is rejected with
`VALIDATION_ERROR`). A null or blank `comment` removes the note.

**Validation.** The server rejects weight and bone mass of 0 or less, any
percentage outside 0–100, and a note longer than 2000
characters. Rejections are returned in the `errors` array with the code
`VALIDATION_ERROR`; nothing is stored. The client validates the same rules
only to give early feedback.
