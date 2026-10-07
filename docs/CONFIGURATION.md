# Athlify Configuration

This reference lists the configuration that currently exists in the
repository. Planned configuration (database, authentication, Strava
credentials, deployment) will be added here once it is implemented. Never
commit credentials or tokens.

## Backend (`src/backend/Athlify.Api/`)

| Setting | Location | Current value / behavior |
| --- | --- | --- |
| Local URL | `Properties/launchSettings.json` (`http` profile) | `http://localhost:5095`, GraphQL IDE at `/graphql` |
| Environment | `ASPNETCORE_ENVIRONMENT` in `launchSettings.json` | `Development` |
| Logging | `appsettings.json`, `appsettings.Development.json` | `Information`; `Microsoft.AspNetCore` at `Warning` |
| Database | `Program.cs` | PostgreSQL through `AddDbContext` + `EnrichNpgsqlDbContext` (connection `postgres-db`, provided by the Aspire AppHost); pending EF Core migrations from `Database/Migrations/` are applied at startup. Endpoint tests swap in EF Core InMemory |
| Development user | `Athlify:DevelopmentUser` (`Email`, `FirstName`, `LastName`) | Until authentication exists, every request acts as this Administrator, created at startup if missing. Defaults: `admin@athlify.local`, `Athlify`, `Admin` |
| Seeding | `Program.cs`, `Database/DbSeeder.cs` | Sample Body-Stats for the development user are seeded at startup when that user has none |
| GraphQL limits | `Program.cs` | Pages of at most 200 (default 100); query cost limits raised to 10,000 |
| `ShouldSeedDb` | `Models/AppSettings.cs` | Defined (default `false`) but not read yet |

Standard ASP.NET Core configuration precedence applies. Environment
variables override `appsettings.{Environment}.json`, which overrides
`appsettings.json`.

Tests replace the seeder with an empty one and the current user with
`TestCurrentUser`, which reads the user id from the `X-Test-User-Id` header
(`Athlify.Api.Tests/MyWebApplicationFactory.cs`), so each test host starts
with an empty database.

### Database migrations

The schema is versioned with EF Core migrations
([ADR-011](copilot/backend/adr/ADR-011-ef-core-migrations.md)). From
`src/backend/`:

```bash
dotnet tool restore                      # installs the pinned dotnet-ef
dotnet ef migrations add <Name> --project Athlify.Api --output-dir Database/Migrations
```

A database created before the migrations existed (the prototype used
`EnsureCreated`) has no migration history and makes the API fail at startup
with "relation already exists". Delete the Aspire data volume once:
`docker volume rm athlify-postgres-data`. It held only prototype sample data.

## Frontend (`src/frontend/athlify/`)

| Setting | Location | Current value / behavior |
| --- | --- | --- |
| Dev server | `vite.config.ts` | Vite defaults (`http://localhost:5173`) |
| UI language | `src/i18n/index.js` | Default `de`, fallback `en`; not persisted |
| Color mode | `src/components/ui/color-mode.tsx` | `next-themes`, class-based light/dark; follows the system until the user picks a mode, which is stored in `localStorage` (`theme`) |
| Theme | `src/theme/` | Colors, gradients, radii, text styles and self-hosted fonts ([ADR-005](copilot/frontend/adr/ADR-005-theme-tokens.md)) |
| TypeScript | `tsconfig.app.json`, `tsconfig.node.json` | Project references; unused locals/parameters are errors |
| Lint and format | `eslint.config.js`, `.prettierrc.json` | No semicolons, single quotes, width 100 |

The frontend has no backend URL or environment variables yet.

## Repository tooling

| Setting | Location | Purpose |
| --- | --- | --- |
| npm package | `src/frontend/athlify/package.json` | Frontend dependencies, scripts and Node.js 20 or later (no root `package.json`) |
| .NET tools | `src/backend/dotnet-tools.json` | Pins `dotnet-ef` for creating migrations |
| Documentation root | `.agents/docs-root` | Points AI documentation skills to `docs/copilot` |

The documentation root is resolved in this order, with the last one that is
set winning: default `docs/`, then `.agents/docs-root` (committed, relative
path), then `.agents/docs-root.local` (git-ignored, machine-specific), then
the `AI_DOCS_ROOT` environment variable. See the
[docs-root reference](../.agents/skills/project-docs/references/docs-root.md).
