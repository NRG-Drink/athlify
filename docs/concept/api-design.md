# Athlify – API Design

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

The API follows REST conventions and provides JSON data. The concrete endpoints are organized around the domain modules.

This is a planned API contract. No API implementation currently exists in the
repository. The backend must remain authoritative for validation, calculated
values, synchronization and ownership; the frontend must not infer or replace
those rules.

| Area | Functions |
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
data server-side. Errors are returned explicitly so clients can distinguish
validation, authorization, synchronization and infrastructure failures from
successful empty results.

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
