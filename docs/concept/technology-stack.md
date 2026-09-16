# Athlify – Technology Stack

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

## Overview

The application provides a German and English user interface. Project documentation is English-only, while source code, identifiers, API names and technical implementation terms are written in English.

| Layer | Technology | Status | Rationale |
|---|---|---|---|
| Frontend | React, TypeScript, Vite | Planned baseline | Component-based UI, type safety and fast development |
| Backend | ASP.NET Core with C# | Planned target | Strongly typed web API and support for authentication and background tasks |
| Database | PostgreSQL | Planned target | Relational data model and suitable time-series aggregations |
| External API | Strava API | Planned integration | Source for activities and bicycles/Gear |
| Authentication | JWT and OAuth 2.0 | Planned approach | User login and Strava connection |

The repository currently contains no implementation or dependency manifests for
these technologies. They are target choices and must not be described as
implemented until source and build configuration exist.

## Rationale

Separating the React frontend and ASP.NET Core web API supports a clear division between the user interface and domain processing. PostgreSQL represents personal data and its relationships. The Strava API is accessed through a dedicated integration layer so that external specifics do not determine the rest of the application.
