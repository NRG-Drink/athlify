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
- A signed-in user changes their own name, language and password only through
  the self-service `updateMe` mutation. It takes no user id and cannot change
  role or username. A password change requires the current password and
  revokes all of the user's refresh tokens, so every device signs in again.
- Administrators list, create and edit users (name, language, role) and set a
  new password for a user. The administrator who sets a password knows it, so
  the user should change it in the settings afterwards. The role is checked in
  the database on every administration request, an administrator cannot change
  their own role, and the last administrator cannot be demoted. A role change
  or password reset revokes the user's refresh tokens. User management shows
  accounts only and never grants access to another user's personal records.
- Administrators can delete a user. This permanently removes the account and
  all of its data (activities including deleted ones, bicycles, gadgets, tags,
  Events, Body-Stats, Strava connection and sessions) and cannot be undone.
  Nobody can delete their own account.

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
