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
| Database | `Program.cs` | EF Core InMemory database `InMemoryDb`; data is lost on restart |
| Seeding | `Program.cs`, `Database/DbSeeder.cs` | Sample Body-Stats are always seeded at startup |
| `ShouldSeedDb` | `Models/AppSettings.cs` | Defined (default `false`) but not read yet |

Standard ASP.NET Core configuration precedence applies. Environment
variables override `appsettings.{Environment}.json`, which overrides
`appsettings.json`.

Tests replace the seeder with an empty one
(`Athlify.Api.Tests/MyWebApplicationFactory.cs`), so each test host starts
with an empty database.

## Frontend (`src/frontend/athlify/`)

| Setting | Location | Current value / behavior |
| --- | --- | --- |
| Dev server | `vite.config.ts` | Vite defaults (`http://localhost:5173`) |
| UI language | `src/i18n/index.js` | Default `de`, fallback `en`; not persisted |
| Color mode | `src/components/ui/color-mode.tsx` | `next-themes`, class-based light/dark |
| TypeScript | `tsconfig.app.json`, `tsconfig.node.json` | Project references; unused locals/parameters are errors |
| Lint and format | `eslint.config.js`, `.prettierrc.json` | No semicolons, single quotes, width 100 |

The frontend has no backend URL or environment variables yet.

## Repository tooling

| Setting | Location | Purpose |
| --- | --- | --- |
| npm package | `src/frontend/athlify/package.json` | Frontend dependencies, scripts and Node.js 20 or later (no root `package.json`) |
| Documentation root | `.agents/docs-root` | Points AI documentation skills to `docs/copilot` |

The documentation root is resolved in this order, with the last one that is
set winning: default `docs/`, then `.agents/docs-root` (committed, relative
path), then `.agents/docs-root.local` (git-ignored, machine-specific), then
the `AI_DOCS_ROOT` environment variable. See the
[docs-root reference](../.agents/skills/project-docs/references/docs-root.md).
