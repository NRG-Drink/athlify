# Athlify — Glossary

> Definitions of the domain, technical and product terms used across Athlify
> documentation. Link to this glossary rather than redefining a term elsewhere.
>
> Tag legend: **(open)** meaning still requires a product or technical
> decision.

## A — C

**Account language** — The language stored on a user's account. Saving it on the
  Settings page switches the interface at once, and it is applied at the start
  of every session (after sign-in and after a reload). The language is chosen on the
  Settings page only. See
  [`CONCEPT.md`](concept/CONCEPT.md#38-settings-and-language).

**Activity** — A single cycling session, entered manually or imported from
Strava. See [`activity-management.md`](concept/activity-management.md).

**Administrator** — A User with all regular personal-area permissions plus
  permission to manage user accounts. See [`CONCEPT.md`](concept/CONCEPT.md).

**API contract** — The agreed inputs, outputs, errors and permission rules
  exchanged between frontend and backend. See [`api-design.md`](concept/api-design.md).

**App Layout** — The shared frame around every view: a skip link, a header
  with the brand, the Primary Navigation and the User Menu, and the main
  content area. See [`SAD.md`](copilot/frontend/SAD.md#app-layout-and-routes).

**ATL / Fatigue** — Acute Training Load, representing short-term training load.
  See [`CONCEPT.md`](concept/CONCEPT.md).

**Body Metrics** — Personal measurements such as weight, body-fat, muscle and
  water percentage, and bone mass. See [`data-model.md`](concept/data-model.md).

**Body-Stats** — Personal body measurements recorded at multiple points in time.
  See [`CONCEPT.md`](concept/CONCEPT.md).

**Body-Stats chart** — The line chart on the Body-Stats page. It shows one
  selected measurement over time for exactly the measurements the history grid
  lists, so it follows the grid's filters. See [`CONCEPT.md`](concept/CONCEPT.md).

**Calendar view** — An activity presentation organized by calendar week with a
  weekly summary.

**Color mode** — The light or dark appearance of the user interface, which the
  user can switch in the User Menu. See
  [ADR-002](copilot/frontend/adr/ADR-002-chakra-ui-component-system.md).

**CTL / Fitness** — Chronic Training Load, representing long-term training load.
  See [`CONCEPT.md`](concept/CONCEPT.md).

## D — F

**Dashboard** — The central analysis view containing metrics, charts, filters and
  timeline information. It shows Track, Fitness and Body Metrics as charts and an
  overview table, grouped by a Grouping, with Events marked in the charts. See
  [`CONCEPT.md`](concept/CONCEPT.md) and
  [ADR-014](copilot/frontend/adr/ADR-014-dashboard-client-side-aggregation.md).

**Grouping** — The bucket size of the Dashboard: day, week (ISO, Monday), month or
  year. Activities are summed and Body-Stats averaged per bucket.

**Event marker** — A line (single-day Event) or band (Event with an end date) drawn in
  the Dashboard charts at the bucket of the Event, so that changes such as an accident
  can be related to the data.

**Preset** — A named, browser-local set of Dashboard filters (period or date range,
  Indoor/Outdoor, tags and Grouping), saved like a Saved view.

**Connection** — The paged form of a list in the API (`edges`, `pageInfo`, cursors),
  following the Relay convention. Lists such as `bodyStats(first, after)` are
  connections; a page holds at most 200 entries. See
  [`ADR-007`](copilot/frontend/adr/ADR-007-domain-page-pattern.md).

**Development user** — The Administrator account that the backend creates at
  startup. Until authentication exists, every request acts as this user. See
  [ADR-009](copilot/adr/ADR-009-ownership-query-filters.md).

**Dialog** — A modal window layered over a page that collects input or asks for
  confirmation without leaving the page, for example the Body-Stats form
  dialog.

**Domain page** — A route-level view of one domain area (Body-Stats today; Events
  and Garage next) that lives in its own folder under `src/features/`, loads its
  data with one query, gives each component its own fragment and updates the
  store after changes instead of refetching. See
  [`ADR-007`](copilot/frontend/adr/ADR-007-domain-page-pattern.md).

**Effort** — How hard an activity felt to the user, from 1 to 10. See
  [ADR-010](copilot/adr/ADR-010-activity-and-event-value-domains.md).

**Entry** — A single Body-Stats record (one measurement on one date), called
  "measurement" in the UI. Users create and edit entries through a Dialog and
  delete them with the trash button at the end of a row, after confirming. See
  [`CONCEPT.md`](concept/CONCEPT.md).

**Event** — A personal time-based record such as an accident, repair, injury,
  break or goal, with an Event type, a start date and an optional end date.
  See [`CONCEPT.md`](concept/CONCEPT.md).

**Event type** — The kind of an Event: crash, injury, illness, repair, break,
  goal or other. See
  [ADR-010](copilot/adr/ADR-010-activity-and-event-value-domains.md).

**Filter** — A selection that determines which data is displayed in a view.

**Fitness Metrics** — Training metrics such as Fitness/CTL, Fatigue/ATL and
  Form/TSB. See [`CONCEPT.md`](concept/CONCEPT.md).

**Form** — A user interface for entering or editing data.

## G — L

**Gadget** — Additional equipment such as a bike computer, heart-rate monitor
  or sensor. See [`data-model.md`](concept/data-model.md).

**Garage** — The personal area for managing bicycles and gadgets. See
[`CONCEPT.md`](concept/CONCEPT.md).

**Global ID** — The opaque, type-aware identifier that the API returns as `id`
  for every entity. Clients never parse or build it. See
  [`ADR-006`](copilot/adr/ADR-006-relay-global-ids.md).

**GraphQL schema** — The typed set of queries and mutations the backend
  exposes. It is the API contract between frontend and backend. See
  [ADR-001](copilot/adr/ADR-001-graphql-api-contract.md).

**Idempotency** — Repeated execution of the same synchronization operation does
  not create an additional domain record. See [`api-design.md`](concept/api-design.md).

**Indoor/Outdoor** **(open)** — The activity type indicating whether a cycling
  session took place indoors or outdoors; the authoritative determination rule
  is still open. See [`activity-management.md`](concept/activity-management.md).

**Input** — The record a client sends to create or update one entity, named
  `<Entity>Input` in the GraphQL schema (for example `ActivityInput`). It holds
  only the fields a client may set: identity, owner, timestamps and calculated
  or Strava-owned values are never part of it. Link lists such as `tagIds` are
  complete sets. See [`api-design.md`](concept/api-design.md).

**KPI tile** — A large, self-explaining value on a page: label, latest value
  with unit, change within the selected Period and the comparison period. A
  missing value is shown as a dash, never as zero.

## M — R

**Maintenance cycle** — A maintenance schedule of exactly one bicycle or
  gadget, with an interval in kilometers, in days or both. Selecting it
  filters the Garage to the linked equipment. See
  [`data-model.md`](concept/data-model.md).

**Merge** — Grouping at least two activities into one shared representation
  without removing the original activities. An activity belongs to at most one
  merge. Its totals (time, distance, elevation gain, TSS) cover the active
  activities only, and it is dissolved when fewer than two remain. See
  [`activity-management.md`](concept/activity-management.md).

**Mood** — How the user felt during an activity: very bad, bad, neutral, good
  or very good. See
  [ADR-010](copilot/adr/ADR-010-activity-and-event-value-domains.md).

**Note** — The one optional free-text field of a Body-Stats entry. The API stores
  it as the plain string field `comment`; there is no separate table or list.

**Owner / user context** — The user who owns a personal record and whose access
  must be checked. Another user's record behaves as if it did not exist. See
  [`security.md`](concept/security.md) and
  [ADR-009](copilot/adr/ADR-009-ownership-query-filters.md).

**Page** — The frame each view renders inside the App Layout: title, optional
  description and actions, and exactly one UI state body (loading, empty,
  error or ready). See [`SAD.md`](copilot/frontend/SAD.md#page-frame).

  **Period** — A relative time span used by the Dashboard filters (30 days, 90 days,
  1 year or all), resolved against today.

**Date range** — An inclusive pair of local calendar dates (`from` and `to`)
  that defines the exact interval shown by the Body-Stats chart and KPI
    comparisons. Activities also use an inclusive date range in their URL-backed
    list filters.

  **Saved view** — A named, browser-local Activities, Events or Body-Stats grid preset containing its
    filters, sort order and column layout. It can be applied or deleted by the
    current browser user; it is not shared or synchronized to another device.

  **Pinned Activity** — A temporary Activities-grid row (Events and Body-Stats grids pin their rows the same way) shown above the
    server-filtered results. Users can pin multiple activities at once and
    unpin them independently; creation pins the new activity until it is
    unpinned.

**Primary Navigation** — The header navigation between the personal areas
  Dashboard, Activities, Garage, Body-Stats and Events. On small screens it
  opens as a drawer. See [`SAD.md`](copilot/frontend/SAD.md#app-layout-and-routes).

**Resolver** — A backend operation that executes a GraphQL query or mutation.
  See [`api-design.md`](concept/api-design.md).

## S — Z

**Soft delete** — Deletion by marking a record so it remains available for
  synchronization and traceability rules. See
  [`activity-management.md`](concept/activity-management.md).

**Source** — The origin of an activity, especially Strava or manual entry. See
  [`activity-management.md`](concept/activity-management.md).

**Settings page** — The `/settings` view where the signed-in user edits their
  own first name, last name, account language and password in two independent
  forms. A password change signs the user out. See
  [`SAD.md`](copilot/frontend/SAD.md#app-layout-and-routes).

**Strava connection** — The link between a user's account and Strava,
  including the connection's tokens and the last synchronization time, status
  and error. A user has at most one. See [`data-model.md`](concept/data-model.md).

**Strava synchronization** — Importing and updating a user's cycling data from
  Strava while preserving ownership, external identifiers and deletion rules.
  See [`activity-management.md`](concept/activity-management.md).

**Tag** — A label that a user defines once and can assign to activities,
  bicycles, gadgets and Events. Tag names are unique per user. See
  [`data-model.md`](concept/data-model.md).

**Toast / feedback** — Short-lived visible information about an action's
  success or failure.

**Track Metrics** — Distance, time, elevation gain, TSS and speed. See
  [`CONCEPT.md`](concept/CONCEPT.md).

**TSB / Form** — Training Stress Balance, describing the relationship between
  Fitness and Fatigue. See [`CONCEPT.md`](concept/CONCEPT.md).

**TSS** — Training Stress Score, a load value for an activity. See
  [`activity-management.md`](concept/activity-management.md).

**UI state** — The loading, empty, error or populated state of a view.

**User management** — The Administrator-only functions to list, create and
  edit user accounts (first name, last name, language, role), to set a new
  password for a user and to delete a user with all their data, through the
  `users`, `createUser`, `updateUser`, `resetUserPassword` and `deleteUser`
  GraphQL operations. It shows accounts only, never a
  user's personal records. The username cannot be changed after creation.
  See [`security.md`](concept/security.md).

**updateMe** — The self-service GraphQL mutation with which a signed-in user
  changes their own first name, last name, language and password. It has no
  user id, role or username input. A password change needs the current
  password and revokes all refresh tokens of the user. See
  [`security.md`](concept/security.md).

**User** — An authenticated account that can access and manage its own
  personal cycling data. See [`CONCEPT.md`](concept/CONCEPT.md).

**User Menu** — The header menu for Settings, the color mode and logout. See
  [`SAD.md`](copilot/frontend/SAD.md#app-layout-and-routes).

**Wind** — The wind conditions of an activity: calm, light, moderate, strong
  or stormy. See
  [ADR-010](copilot/adr/ADR-010-activity-and-event-value-domains.md).
