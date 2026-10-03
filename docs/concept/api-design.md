# Athlify – API Design

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

The API is a GraphQL schema served by Hot Chocolate at `/graphql` (proposed
in [ADR-001](../copilot/adr/ADR-001-graphql-api-contract.md), which replaces
the earlier REST plan). Queries and mutations are organized around the domain
modules. The Strava OAuth callback may still need a plain HTTP endpoint.

This is a planned API contract. The backend prototype implements Body-Stats
queries and mutations only, without authentication or ownership. The backend must remain authoritative for validation, calculated
values, synchronization and ownership; the frontend must not infer or replace
those rules.

| Area | Queries and mutations |
|---|---|
| Auth | Registration, login, logout and token renewal |
| User | Own profile; Administrator-only user administration |
| Strava | Connect, disconnect, status and synchronization |
| Activities | List, view, create, edit, delete and synchronize |
| Vehicles | List, create, edit, delete and synchronize |
| Gadgets | List, create, edit and delete |
| Body-Stats | List, create, edit and delete |
| Events | List, create, edit and delete |
| Dashboard | Metrics, charts and analyses |

All personal endpoints verify authentication and ownership of the requested
data server-side. Errors are returned explicitly in the GraphQL `errors` array so
clients can distinguish validation, authorization, synchronization and
infrastructure failures from successful empty results.

## Activities

The Activities functions support full CRUD for manual and synchronized activities:

- List activities and filter them using the dashboard criteria.
- Display activity details as a form.
- Create, edit and soft-delete activities.
- Start Strava synchronization from the Activities page.
- Group activities into a merged activity.
- Provide calendar data and weekly summaries.

Calculated and system-managed fields are returned, but are not intended as
editable input fields. Internal IDs and external Strava IDs are separate
references, and synchronization operations must be idempotent.

## Body-Stats

Body-Stats are implemented in the backend prototype and define the pattern
that the other domain areas follow.

**Identifiers.** Every `id` is a Relay global ID (an opaque string) following
[ADR-006](../copilot/adr/ADR-006-relay-global-ids.md). Clients never parse or
build it, and `node(id:)` resolves any entity that implements `Node`.

| Operation | Behavior |
|---|---|
| `bodyStats` | All measurements, newest first; supports filtering and sorting. Includes their notes. |
| `bodyStatsById(id)` | One measurement, or `null`. |
| `addBodyStats(bodyStats)` | Creates a measurement with its notes and returns it. |
| `updateBodyStats(id, bodyStats)` | Replaces the measurement values and synchronizes the notes; returns `null` if the measurement does not exist. |
| `deleteBodyStats(id)` | Deletes the measurement and its notes; returns the deleted `id`, or `null` if it did not exist. |

**Input.** `BodyStatsDtoInput` carries `date`, `weight`, `bodyFatPercentage`,
`musclePercentage`, `waterPercentage`, `boneMass` and `comments`, a list of
`{ id?, content }` with at most one entry (the note); more than one is
rejected with `VALIDATION_ERROR`. The list shape is kept so several notes
can be allowed later without changing the schema. Identity and timestamps of notes are
set by the server.
On update the list is the complete set of notes: a note with an `id` is
edited, a note without one is added and an existing note that is missing from
the list is removed. A note `id` that belongs to another measurement is
rejected.

**Validation.** The server rejects weight and bone mass of 0 or less, any
percentage outside 0–100, and notes that are empty or longer than 2000
characters. Rejections are returned in the `errors` array with the code
`VALIDATION_ERROR`; nothing is stored. The client validates the same rules
only to give early feedback.
