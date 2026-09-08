# Athlify Frontend – Software Architecture Document

## Scope

This document describes the technical context for frontend changes. The functional big picture is in [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md); shared technical decisions are listed in the concept documents.

## Current frontend state

There is currently no independent frontend source code in the repository. The existing code under `../../../src/GettingStarted/` is backend prototype code. Frontend conventions must therefore not be inferred from it.

The frontend technology, bundling and concrete folder structure are open technical decisions. When introduced, they must be recorded in `../../concept/technology-stack.md` and this document.

## Responsibility boundary

The frontend is responsible for navigation, presentation, input, local UI states, validation feedback and understandable presentation of backend errors. Authentication, authorization, ownership checks, persistence, TSS/Fitness calculation and Strava synchronization are backend responsibilities.

## Language and naming conventions

The user interface supports German and English. Visible text is maintained through translations and is not hard-coded as a single language in components. Documentation is English-only; source code, components, variables, routes and API names are named in English.

## UI structure

The domain areas are implemented as independent views or clearly separated UI modules:

1. Login and user account
2. Dashboard
3. Activities with list, form and calendar
4. Garage with bicycles and gadgets
5. Body-Stats
6. Events

Shared components for navigation, filters, forms, tables, charts, dialogs and feedback should be reused.

## State and interaction rules

- Data-dependent pages show loading, empty, error and success states.
- Filters are passed consistently to all affected Dashboard presentations.
- Unsaved form changes are not shown as saved.
- Non-editable Activity fields are visible but read-only.
- Sync, delete and merge operations need clear feedback; destructive actions are confirmed or made safely undoable.
- Responsive behavior is provided for desktop, tablet and smartphone.

## Development guardrails

- Before UI changes, check the backend contract and existing user stories.
- Do not hide API or persistence logic in presentation components.
- Do not duplicate domain rules in multiple components.
- Never display external data as trusted UI values without validation.
- Handle errors explicitly; do not use empty success states as fallbacks.
- Keep frontend and backend documentation synchronized when data shapes change.

## Technical detail sources

- [`../../concept/technology-stack.md`](../../concept/technology-stack.md)
- [`../../concept/architecture.md`](../../concept/architecture.md)
- [`../../concept/data-model.md`](../../concept/data-model.md)
- [`../../concept/api-design.md`](../../concept/api-design.md)
- [`../../concept/activity-management.md`](../../concept/activity-management.md)
- [`../../concept/security.md`](../../concept/security.md)
- [`../../concept/testing-deployment.md`](../../concept/testing-deployment.md)
- [`../backend/SAD.md`](../backend/SAD.md)
