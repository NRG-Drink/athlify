# ADR-004: React Router data mode with a nested app-layout route

**Date**: 2026-09-26
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

Every domain view (Dashboard, Activities, Garage, Body-Stats, Events,
Settings) shares one App Layout with a header, Primary Navigation and User
Menu. The prototype used `react-router-dom` v7 in declarative mode
(`BrowserRouter` + `<Routes>`), which has no route-level error handling. A
view that throws while rendering, for example a Relay query that fails
because the backend is down, would blank the whole page. The route structure
and URL paths constrain every future view and are costly to change once
links and bookmarks exist.

## Options Considered

### Option 1: Declarative mode (`BrowserRouter` + `<Routes>`)

- Pros: Already in place; minimal API surface.
- Cons: No `errorElement`, so a hand-written class error boundary is needed.
  Routes live in JSX, so tests must duplicate them.

### Option 2: Data mode (`createBrowserRouter` + `RouterProvider`)

- Pros: Per-route `errorElement`. Routes are plain `RouteObject` data
  shared by production and tests (`createMemoryRouter`). Enables loaders
  later without restructuring. It is the mode React Router v7 recommends.
- Cons: Slightly more setup. Components outside the router tree cannot
  use router hooks.

### Option 3: Framework mode (React Router as a framework / file-based routes)

- Pros: Conventions for code-splitting and data loading.
- Cons: Replaces the Vite SPA setup, and SSR/framework features aren't
  needed for a self-hosted SPA. Too large a change for the project scope.

## Decision

**Chosen**: Option 2 — Data mode with a nested app-layout route

A single pathless layout route renders the App Layout and hosts all views as
children. Its `errorElement` keeps the header usable when a view fails. This
covers the SAD requirement for explicit error states and keeps the setup
within a small SPA.

## Consequences

### Positive

- Route render errors show inside the App Layout instead of a blank page.
- Tests render the real route table through `createMemoryRouter`.
- URL paths are defined once in `src/navigation/paths.ts`.

### Negative / Trade-offs

- Production hosting needs an SPA fallback (serve `index.html` for unknown
  paths). Hosting is still undecided.
- Providers that need router hooks must render inside the route tree.

## Implementation Notes

- `src/routes.tsx` exports `routes: RouteObject[]`. `main.tsx` creates the
  browser router from it, and tests create a memory router from it.
- URL paths come only from `paths` (`src/navigation/paths.ts`). Primary
  Navigation items are listed in `src/navigation/navItems.ts`. Do not
  hard-code paths in components.
- URLs are English kebab-case (`/body-stats`), matching glossary terms.
- New views are added as children of the layout route and wrap their
  content in the `Page` component.
