# Athlify — Glossary

> Definitions of the domain, technical and product terms used across Athlify
> documentation. Link to this glossary rather than redefining a term elsewhere.
>
> Tag legend: **(open)** meaning still requires a product or technical
> decision.

## A — C

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

**Body Metrics** — Personal measurements such as weight, body height, body-fat,
  muscle and water percentage, and bone mass. See [`data-model.md`](concept/data-model.md).

**Body-Stats** — Personal body measurements recorded at multiple points in time.
  See [`CONCEPT.md`](concept/CONCEPT.md).

**Calendar view** — An activity presentation organized by calendar week with a
  weekly summary.

**Color mode** — The light or dark appearance of the user interface, which the
  user can switch in the User Menu. See
  [ADR-002](copilot/frontend/adr/ADR-002-chakra-ui-component-system.md).

**CTL / Fitness** — Chronic Training Load, representing long-term training load.
  See [`CONCEPT.md`](concept/CONCEPT.md).

## D — F

**Dashboard** — The central analysis view containing metrics, charts, filters and
  timeline information. See [`CONCEPT.md`](concept/CONCEPT.md).

**Event** — A personal time-based record such as an accident, repair, injury,
  break or goal. See [`CONCEPT.md`](concept/CONCEPT.md).

**Filter** — A selection that determines which data is displayed in a view.

**Fitness Metrics** — Training metrics such as Fitness/CTL, Fatigue/ATL and
  Form/TSB. See [`CONCEPT.md`](concept/CONCEPT.md).

**Form** — A user interface for entering or editing data.

## G — L

**Gadget** — Additional equipment such as a bike computer, heart-rate monitor
  or sensor. See [`data-model.md`](concept/data-model.md).

**Garage** — The personal area for managing bicycles and gadgets. See
[`CONCEPT.md`](concept/CONCEPT.md).

**GraphQL schema** — The typed set of queries and mutations the backend
  exposes. It is the API contract between frontend and backend. See
  [ADR-001](copilot/adr/ADR-001-graphql-api-contract.md).

**Idempotency** — Repeated execution of the same synchronization operation does
  not create an additional domain record. See [`api-design.md`](concept/api-design.md).

**Indoor/Outdoor** **(open)** — The activity type indicating whether a cycling
  session took place indoors or outdoors; the authoritative determination rule
  is still open. See [`activity-management.md`](concept/activity-management.md).

**Language switcher** — The UI control in the User Menu that switches the
  interface language between German and English. See
  [ADR-003](copilot/frontend/adr/ADR-003-i18next-localization.md).

## M — R

**Merge** — Grouping multiple activities into one shared representation without
  removing the original activities. See [`activity-management.md`](concept/activity-management.md).

**Owner / user context** — The user who owns a personal record and whose access
  must be checked. See [`security.md`](concept/security.md).

**Page** — The frame each view renders inside the App Layout: title, optional
  description and actions, and exactly one UI state body (loading, empty,
  error or ready). See [`SAD.md`](copilot/frontend/SAD.md#page-frame).

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

**Strava synchronization** — Importing and updating a user's cycling data from
  Strava while preserving ownership, external identifiers and deletion rules.
  See [`activity-management.md`](concept/activity-management.md).

**Tag** **(open)** — A freely or administratively assigned label for an
  activity; the exact variant is still open. See
  [`activity-management.md`](concept/activity-management.md).

**Toast / feedback** — Short-lived visible information about an action's
  success or failure.

**Track Metrics** — Distance, time, elevation gain, TSS and speed. See
  [`CONCEPT.md`](concept/CONCEPT.md).

**TSB / Form** — Training Stress Balance, describing the relationship between
  Fitness and Fatigue. See [`CONCEPT.md`](concept/CONCEPT.md).

**TSS** — Training Stress Score, a load value for an activity. See
  [`activity-management.md`](concept/activity-management.md).

**UI state** — The loading, empty, error or populated state of a view.

**User** — An authenticated account that can access and manage its own
  personal cycling data. See [`CONCEPT.md`](concept/CONCEPT.md).

**User Menu** — The header menu for Settings, the language switcher and the
  color mode. It will hold logout once authentication exists. See
  [`SAD.md`](copilot/frontend/SAD.md#app-layout-and-routes).
