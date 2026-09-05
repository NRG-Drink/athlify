# Athlify – Technology Stack

Technical detail documentation for the functional concept in [`docs/athlify_concept.md`](../athlify_concept.md).

## Overview

The application provides a German and English user interface. Project documentation is English-only, while source code, identifiers, API names and technical implementation terms are written in English.

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React, TypeScript, Vite | Component-based UI, type safety and fast development |
| Backend | ASP.NET Core with C# | Strongly typed web API and good support for authentication and background tasks |
| Database | PostgreSQL | Relational data model and suitable time-series aggregations |
| External API | Strava API | Source for activities and bicycles/Gear |
| Authentication | JWT and OAuth 2.0 | User login and Strava connection |

## Rationale

Separating the React frontend and ASP.NET Core web API supports a clear division between the user interface and domain processing. PostgreSQL represents personal data and its relationships. The Strava API is accessed through a dedicated integration layer so that external specifics do not determine the rest of the application.
