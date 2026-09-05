# Athlify – Testing Strategy and Deployment

Technical detail documentation for the functional concept in [`docs/athlify_concept.md`](../athlify_concept.md).

## Testing strategy

| Test level | Focus |
|---|---|
| Unit tests | Individual services, analyses and UI components |
| Integration tests | Interaction of API, data access and Strava integration |
| API tests | Contract-compliant behavior of domain endpoints |
| End-to-end tests | Login, synchronization, activity management and dashboard |
| Manual tests | Usability, responsive presentation and visual consistency |

The most important user flows are login, synchronization, manual activity entry, Garage, Body-Stats, Events and Dashboard.

## Deployment

Athlify is self-hosted. Frontend, backend and database run as separate containers through Docker Compose. A reverse proxy provides external access and TLS termination. Regular backups and a documented recovery process are required.
