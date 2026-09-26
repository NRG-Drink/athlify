# Athlify Frontend – Software Architecture Document

**Project**: Athlify
**Last Updated**: 2026-09-26
**Version**: 1.0

## Overview

The frontend will provide the responsive, bilingual user interface for
Athlify's personal cycling data. It consumes the backend contract and does not
own persistence, authorization or domain calculations.

## Architecture Style

The target architecture is a modular single-page application built from
separate domain views and shared presentation modules. It uses React 19,
TypeScript and Vite.

## Technology Stack

| Layer | Technology | Status |
| --- | --- | --- |
| Framework | React 19, TypeScript 6 (`tsc -b` project references), Vite 8 | Implemented |
| Components and theming | Chakra UI v3 with Emotion and `next-themes` color mode | Proposed in [ADR-002](adr/ADR-002-chakra-ui-component-system.md) |
| Styling utilities | Tailwind CSS v4 through `@tailwindcss/vite` | Loaded; coexistence with Chakra is open |
| Charts | Recharts 3 and `@chakra-ui/charts` | Being evaluated with prototype variants |
| Routing | `react-router-dom` v7 data mode (`createBrowserRouter`, nested app-layout route) | Proposed in [ADR-004](adr/ADR-004-react-router-data-mode.md) |
| Localization | i18next with react-i18next (`de` default, `en` fallback) | Proposed in [ADR-003](adr/ADR-003-i18next-localization.md) |
| Icons | `react-icons` (Lucide set) | Implemented |
| Testing | Vitest + React Testing Library + user-event in jsdom (`npm test`) | Implemented |
| Tooling | ESLint 10 + typescript-eslint, Prettier; Lefthook installed, but all hook commands in `lefthook.yml` are currently commented out | Implemented |
| Backend contract | Hot Chocolate GraphQL | Proposed in [shared ADR-001](../adr/ADR-001-graphql-api-contract.md); no client integration yet |
| Auth | Backend-owned authentication and authorization | Planned |
| Hosting | Open | Not decided |

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

The frontend is under `../../../src/frontend/athlify/`. It is an npm
workspace of the root `package.json`. It is an app shell used for technology
exploration. No Athlify domain behavior is implemented, and it does not call
the backend yet.

```text
src/frontend/athlify/src/
├── main.tsx          # entry: StrictMode, Relay, Chakra Provider, RouterProvider
├── routes.tsx        # route table (RouteObject[]) shared by app and tests
├── navigation/       # paths.ts (URL constants), navItems.ts (Primary Navigation)
├── layouts/          # AppLayout, AppHeader, PrimaryNav, MobileNav, UserMenu
├── app/              # route-level views (BodyStats, PlaceholderPage, NotFoundPage, RouteErrorPage)
├── components/       # shared components (Page, charts, toggles, switcher)
│   └── ui/           # generated Chakra UI snippets (provider, color-mode, toaster, tooltip)
├── test/             # Vitest setup (jsdom stubs) and renderRoute helper
├── hooks/            # shared hooks (empty)
├── types/            # shared types (empty)
├── i18n/             # i18next setup and de/en locale resources
└── index.css         # Tailwind import only
```

The App Layout and routing are implemented. Dashboard, Activities, Garage,
Events and Settings render placeholder pages. The `/body-stats` view compares
three prototype chart variants; the hybrid variant queries the backend
prototype through Relay. State management, the GraphQL client and the
Tailwind/Chakra boundary are still open decisions. Record them as ADRs when
they are made.

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

### App Layout and routes

All views render inside the App Layout (`src/layouts/AppLayout.tsx`): a skip
link, a sticky header with the brand, the Primary Navigation and the User
Menu, and the `main` content area. Below the `md` breakpoint the Primary
Navigation moves into a drawer opened by a menu button. The User Menu holds
Settings, the language switcher and the color-mode toggle. Render errors of a
view are shown inside the layout through the route `errorElement`
([ADR-004](adr/ADR-004-react-router-data-mode.md)).

| Path | View | Navigation |
| --- | --- | --- |
| `/` | redirects to `/dashboard` | – |
| `/dashboard` | Dashboard (placeholder) | Primary Navigation |
| `/activities` | Activities (placeholder) | Primary Navigation |
| `/garage` | Garage (placeholder) | Primary Navigation |
| `/body-stats` | Body-Stats (chart prototype) | Primary Navigation |
| `/events` | Events (placeholder) | Primary Navigation |
| `/settings` | Settings (placeholder) | User Menu |
| any other | Not Found page | – |

There is no Administration entry until the backend exposes user roles.

### Page frame

Every view wraps its content in `Page` (`src/components/Page.tsx`). It
renders the `h1` title, an optional description and an actions area, and it
sets the document title. Its `status` prop (`ready`, `loading`, `empty`,
`error`) selects exactly one body. Children render only when the status is
`ready`, so stale content never looks like current data.

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

- Current capacity: Technology-exploration app shell; no product behavior.
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
