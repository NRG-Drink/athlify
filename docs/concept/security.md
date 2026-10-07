# Athlify – Security Requirements

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

These are target security requirements. The backend enforces ownership for
every personal record
([ADR-009](../copilot/adr/ADR-009-ownership-query-filters.md)), but
authentication does not exist yet: every request acts as a provisioned
development user, so the API must not be exposed beyond a local machine.

## Authentication and authorization

- Login with email and password.
- Short-lived access token and revocable refresh token.
- Role-based permissions for user administration. Administrators retain all
  permissions available to regular users and gain additional user-management
  permissions.
- Check user ownership for every personal resource.

## Protection of personal data

- Passwords are not stored in plain text.
- Strava tokens are stored securely.
- Communication is encrypted.
- Inputs are validated server-side.
- Rate limiting protects login and synchronization from abuse.
- CORS, XSS, CSRF and SQL injection protection must be addressed as
  appropriate to the selected implementation.
- UI filters are not an authorization boundary; every personal query,
  mutation and synchronization must enforce the authenticated owner context
  server-side.
