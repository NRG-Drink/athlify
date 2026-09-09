# Athlify — Glossary

> Definitions of the domain, technical and product terms used across Athlify
> documentation. Link to this glossary rather than redefining a term elsewhere.
>
> Tag legend: **(open)** meaning still requires a product or technical
> decision.

## A — C

**Activity** — A single cycling session, entered manually or imported from
Strava. See [`activity-management.md`](concept/activity-management.md).

**API contract** — The agreed inputs, outputs, errors and permission rules
  exchanged between frontend and backend. See [`api-design.md`](concept/api-design.md).

**ATL / Fatigue** — Acute Training Load, representing short-term training load.
  See [`CONCEPT.md`](concept/CONCEPT.md).

**Body Metrics** — Personal measurements such as weight, body fat, muscle,
  water and bone percentage. See [`data-model.md`](concept/data-model.md).

**Body-Stats** — Personal body measurements recorded at multiple points in time.
  See [`CONCEPT.md`](concept/CONCEPT.md).

**Calendar view** — An activity presentation organized by calendar week with a
  weekly summary.

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

**Garage** — The personal area for managing bicycles and gadgets. See
[`CONCEPT.md`](concept/CONCEPT.md).

**Gadget** — Additional equipment such as a bike computer, heart-rate monitor
  or sensor. See [`data-model.md`](concept/data-model.md).

**Idempotency** — Repeated execution of the same synchronization operation does
  not create an additional domain record. See [`api-design.md`](concept/api-design.md).

**Indoor/Outdoor** **(open)** — The activity type indicating whether a cycling
  session took place indoors or outdoors; the authoritative determination rule
  is still open. See [`activity-management.md`](concept/activity-management.md).

## M — R

**Merge** — Grouping multiple activities into one shared representation without
  removing the original activities. See [`activity-management.md`](concept/activity-management.md).

**Owner / user context** — The user who owns a personal record and whose access
  must be checked. See [`security.md`](concept/security.md).

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
