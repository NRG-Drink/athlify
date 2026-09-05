# Athlify – Glossary

This shared glossary is the binding source for domain, user-facing and technical terms used by Athlify. English identifiers in code may differ, but they must retain the same meaning.

## Language rule

The application provides a German and English user interface. Project documentation under `docs/` is English-only. Source code, comments, identifiers, API names, database names and technical terms are written in English. Domain terms may be documented in this glossary with their user-facing meaning and English code spelling.

## Maintenance

The root `AGENTS.md` requires Copilot to update this glossary in the same change whenever a new or renamed term is introduced or a meaning changes. This applies especially to user-facing terms, domain concepts, UI states, filters, routes, API, data-model, integration and security terms. Implementation-only changes without new terminology do not change the glossary. Unresolved terms are documented as open decisions and are not replaced with ad hoc synonyms.

| Term | Meaning |
|---|---|
| Activity / activity | A single cycling session, entered manually or imported from Strava. |
| Garage | Personal area for bicycles and gadgets. |
| Bicycle / Vehicle | The bicycle used for cycling; code may use `Vehicle`. |
| Gadget | Additional equipment such as a bike computer, heart-rate monitor or sensor. |
| Event | A personal time-based event, e.g. accident, repair, injury, break or goal. |
| Body-Stats | Personal body measurements recorded at multiple points in time. |
| Dashboard | Central analysis view with metrics, charts, filters and timeline information. |
| Track Metrics | Distance, time, elevation gain, TSS and speed. |
| Fitness Metrics | Fitness/CTL, Fatigue/ATL and Form/TSB. |
| Body Metrics | Weight, body-fat, muscle, water and bone percentage. |
| TSS | Training Stress Score; a load value for an activity. |
| CTL / Fitness | Chronic Training Load; long-term training load. |
| ATL / Fatigue | Acute Training Load; short-term training load. |
| TSB / Form | Training Stress Balance; relationship between Fitness and Fatigue. |
| Strava synchronization | Import and update of the user's cycling data from Strava. |
| Source | Origin of an Activity, especially `Strava` or `manual`. |
| Soft delete | Technical deletion by marking; the record remains for synchronization and traceability rules. |
| Merge | Grouping multiple Activities into one shared representation without removing the originals. |
| Tag | A freely or administratively assigned label for an Activity; the exact variant is still open. |
| Owner / User context | The user who owns a personal record and whose access must be checked. |
| UI state | Loading, empty, error or populated state of a view. |
| Filter | A selection that determines which data is displayed in a view. |
| Form | UI for entering or editing data. |
| Calendar view | Activity display by calendar week with a weekly summary. |
| Toast / feedback | Short-lived visible information about an action's success or failure. |
| API contract | Agreed inputs, outputs, errors and permission rules between backend and frontend. |
| Resolver | Backend operation that executes a GraphQL query or mutation. |
| Idempotency | Repeated execution of the same synchronization operation does not create an additional domain record. |
| Open-source student project | Athlify is developed by a two-person team in an educational context; the scope intentionally remains limited. |

## Spelling

- In English prose: **Activity**, **bicycle**, **Gadget**, **body data**.
- In domain and technical field names: `Activity`, `Vehicle`, `BodyStat`,
  `createdAt`, `updatedAt`.
- `Indoor/Outdoor` denotes the activity type, not a separate sport.
- Strava is an external data source; Athlify is the local target system.
- UI text is maintained in German and English through translation resources;
  technical field names must not appear unchecked in the interface.
- Field names and enum values in the API contract remain stable or are changed
  through a documented migration.
