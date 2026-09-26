# Athlify – Testing Strategy and Deployment

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

The following strategy describes the target product. Currently the backend
has TUnit endpoint tests (`src/backend/Athlify.Api.Tests/`) against the
GraphQL endpoint. The frontend has Vitest + React Testing Library component
and routing tests (`npm test`), plus type checking and linting. There
are no git hooks. There is no deployment configuration.

## Testing strategy

| Test level | Focus |
|---|---|
| Unit tests | Individual services, analyses and UI components |
| Integration tests | Interaction of API, data access and Strava integration |
| API tests | Contract-compliant behavior of domain endpoints |
| End-to-end tests | Login, synchronization, activity management and dashboard |
| Manual tests | Usability, responsive presentation and visual consistency |

The most important user flows are login, synchronization, manual activity
entry, Garage, Body-Stats, Events and Dashboard. Tests must also cover
ownership isolation, idempotent synchronization, soft-delete non-reactivation,
explicit loading/empty/error states and bilingual central interfaces.

## Deployment

Athlify is self-hosted. Frontend, backend and database run as separate containers through Docker Compose. A reverse proxy provides external access and TLS termination. Regular backups and a documented recovery process are required.
