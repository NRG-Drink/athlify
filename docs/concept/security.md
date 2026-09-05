# Athlify – Security Requirements

Technical detail documentation for the functional concept in [`CONCEPT.md`](CONCEPT.md).

## Authentication and authorization

- Login with email and password.
- Short-lived access token and revocable refresh token.
- Role-based permissions for optional administration.
- Check user ownership for every personal resource.

## Protection of personal data

- Passwords are not stored in plain text.
- Strava tokens are stored securely.
- Communication is encrypted.
- Inputs are validated server-side.
- Rate limiting protects login and synchronization from abuse.
- CORS, XSS, CSRF and SQL injection protection are implemented as appropriate to the implementation.
