# Athlify Frontend – Software Architecture Document

**Project**: Athlify
**Last Updated**: 2026-09-09
**Version**: 1.0

## Overview

The frontend will provide the responsive, bilingual user interface for
Athlify's personal cycling data. It consumes the backend contract and does not
own persistence, authorization or domain calculations.

## Architecture Style

The target architecture is a modular client application composed of separated
domain views and shared presentation modules. The concrete framework and
bundler remain open decisions.

## Technology Stack

| Layer | Technology | Rationale |
| --- | --- | --- |
| Frontend | React, TypeScript and Vite (planned baseline) | Documented starting point; no independent frontend source exists yet |
| Backend | ASP.NET Core with Hot Chocolate GraphQL prototype | Current repository contract and prototype |
| Database | Backend-owned; final persistence is open | The frontend must not own domain persistence |
| Auth | Backend-owned authentication and authorization | Personal data ownership must be enforced server-side |
| Hosting | Open | Deployment architecture is not yet decided |

## System Components

    User
      |
      v
    Frontend views and shared UI
      |
      v
    Backend API / GraphQL contract

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

## Key Components

### Domain views

- **Responsibility**: Present and edit user-facing data for authentication,
  Dashboard, Activities, Garage, Body-Stats and Events.
- **Interfaces**: Consume backend queries and mutations through the agreed API
  contract.
- **Data ownership**: Own only local presentation and interaction state.

### Shared UI modules

- **Responsibility**: Provide consistent navigation, filters, forms, tables,
  charts, dialogs and feedback.
- **Interfaces**: Reusable view-level components with bilingual labels and
  accessible interaction states.
- **Data ownership**: No persistent domain data.

## State and interaction rules

- Data-dependent pages show loading, empty, error and success states.
- Filters are passed consistently to all affected Dashboard presentations.
- Unsaved form changes are not shown as saved.
- Non-editable Activity fields are visible but read-only.
- Sync, delete and merge operations need clear feedback; destructive actions are confirmed or made safely undoable.
- Responsive behavior is provided for desktop, tablet and smartphone.

## Data Flow

Views request data from the backend contract, render explicit loading, empty,
error and populated states, and submit mutations through backend-owned
validation. A successful mutation refreshes or updates affected views only
after the backend confirms the change.

## External Integrations

| Service | Purpose | Authentication |
| ------- | ------- | -------------- |
| Backend API / GraphQL | Personal data, calculations and mutations | Application authentication |
| Strava | Indirect activity synchronization through the backend | Backend-managed OAuth/token flow |

## Security Model

- Authentication: Provided and enforced by the backend.
- Authorization: Never inferred from UI filters; backend ownership checks are
  authoritative.
- Secrets management: Credentials and tokens are not stored in frontend source
  code, documentation or fixtures.

## Scalability

- Current capacity: No independent frontend implementation exists yet.
- Scaling strategy: Keep views and shared UI modules independently replaceable;
  defer deployment-specific scaling decisions.
- Known bottlenecks: Backend API and synchronization performance are outside
  the frontend boundary.

## ADR References

See [`../adr/README.md`](../adr/README.md) for frontend and shared decision
records.

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
