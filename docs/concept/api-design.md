# Athlify – API Design

Technical detail documentation for the functional concept in [`docs/athlify_concept.md`](../athlify_concept.md).

The API follows REST conventions and provides JSON data. The concrete endpoints are organized around the domain modules.

| Area | Functions |
|---|---|
| Auth | Registration, login, logout and token renewal |
| User | Own profile and optional user administration |
| Strava | Connect, disconnect, status and synchronization |
| Activities | List, view, create, edit, delete and synchronize |
| Vehicles | List, create, edit, delete and synchronize |
| Gadgets | List, create, edit and delete |
| Body-Stats | List, create, edit and delete |
| Events | List, create, edit and delete |
| Dashboard | Metrics, charts and analyses |

All personal endpoints verify authentication and ownership of the requested data.

## Activities

The Activities functions support full CRUD for manual and synchronized activities:

- List activities and filter them using the dashboard criteria.
- Display activity details as a form.
- Create, edit and soft-delete activities.
- Start Strava synchronization from the Activities page.
- Group activities into a merged activity.
- Provide calendar data and weekly summaries.

Calculated and system-managed fields are returned, but are not intended as editable input fields.
