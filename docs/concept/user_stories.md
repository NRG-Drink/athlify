# Athlify – User Stories

Derived from the functional software concept (`CONCEPT.md`). Prioritized using MoSCoW (Must/Should/Could Have).

| ID | Module | User story | Acceptance criteria | Priority |
|---|---|---|---|:---:|
| US-01 | Auth | As a user, I want to register and log in so that my data is assigned to me. | Registration and login are possible; after successful login the personal dashboard opens; incorrect input is reported clearly. | Must Have |
| US-02 | Activities | As a user, I want to synchronize my Strava activities so that my training data is imported automatically. | New and updated cycling activities are imported; duplicate activities are avoided; synchronization errors are displayed. | Must Have |
| US-03 | Activities | As a user, I want to create, edit and delete activities manually so that I can manage data without Strava. | Activities can be displayed in a table, detail form and calendar view with weekly summary; all non-calculated fields are editable; system and calculated data are marked with `*`; deletion is a soft delete; activities can be merged. | Must Have |
| US-04 | Activities | As a user, I want to start Strava synchronization directly on the Activities page so that my activity list stays current. | A visible Strava sync button starts synchronization; the last synchronization time and error status are displayed; soft-deleted activities are not reactivated. | Must Have |
| US-05 | Dashboard | As a user, I want to see a visually appealing dashboard with Track, Fitness and Body Metrics so that I can analyze my cycling data, training load and physical development. | Track Metrics, Fitness Metrics and Body Metrics are displayed with the defined metrics; trends over time and relevant events are visible; data can be filtered by period, tags, Indoor/Outdoor and bicycle; a clear empty state appears when data is missing. | Must Have |
| US-06 | Garage | As a user, I want to manage bicycles in my Garage so that I can track their use. | Bicycles can be created, viewed, edited, synchronized and deleted; activities can be assigned to a bicycle. | Must Have |
| US-07 | Garage | As a user, I want to manage gadgets in my Garage so that my cycling equipment is fully documented. | Gadgets can be recorded, edited and deleted with name, category, brand, model and description. | Should Have |
| US-08 | Body-Stats | As a user, I want to record and edit Body-Stats so that I can track personal development. | Multiple dated measurements can be stored, edited and deleted; the data remains private. | Should Have |
| US-09 | Events | As a user, I want to record events such as accidents or repairs so that they appear in the timeline of my activities. | Events contain date, type, title and description; they appear on the Events page and Dashboard. | Should Have |
| US-10 | Settings | As a user, I want to switch between German and English so that I can use the application in my preferred language. | Navigation, messages and central domain views are available in both languages. | Should Have |
| US-11 | Administration | As an administrator, I want to manage users so that the local application can be administered. | User administration is available only to administrators; other users' personal data remains protected. | Could Have |

## Out-of-scope requirements

- Public project/documentation website.
- Public demo mode without a user account.
- Paid subscription.
- Group, club and social features.
- Support for sports other than cycling.

## Reference

The functional big picture, use cases and overarching requirements are in
[`CONCEPT.md`](CONCEPT.md). The other documents under `docs/concept/` contain
detailed functional specifications and technical implementation details.
