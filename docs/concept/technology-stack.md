# Athlify – Technology Stack

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

## Overview

The application provides a German and English user interface. Project documentation is English-only, while source code, identifiers, API names and technical implementation terms are written in English.

| Layer | Technology | Status | Rationale |
|---|---|---|---|
| Frontend | React, TypeScript, Vite | Prototype app shell | Component-based UI, static typing and fast development |
| UI components | Chakra UI v3 | Proposed | Accessible components, theming and light/dark mode ([ADR-002](../copilot/frontend/adr/ADR-002-chakra-ui-component-system.md)) |
| Localization | i18next / react-i18next | Proposed | German and English UI from translation resources ([ADR-003](../copilot/frontend/adr/ADR-003-i18next-localization.md)) |
| Backend | ASP.NET Core with C# (.NET 10) | Prototype | Strongly typed web API and support for authentication and background tasks |
| API | GraphQL with Hot Chocolate | Proposed; prototype | One typed schema for all domain modules ([ADR-001](../copilot/adr/ADR-001-graphql-api-contract.md)) |
| Database | PostgreSQL | Planned target | Relational data model and suitable time-series aggregations; the prototype uses EF Core InMemory |
| External API | Strava API | Planned integration | Source for activities and bicycles/Gear |
| Authentication | JWT and OAuth 2.0 | Planned approach | User login and Strava connection |

The repository contains a React/TypeScript frontend app shell under
`src/frontend/athlify/` and an ASP.NET Core GraphQL backend prototype under
`src/backend/`. Neither implements the product domain yet, and the frontend
does not call the backend.

## Rationale

Separating the React frontend and ASP.NET Core web API supports a clear division between the user interface and domain processing. PostgreSQL represents personal data and its relationships. The Strava API is accessed through a dedicated integration layer so that external specifics do not determine the rest of the application.
