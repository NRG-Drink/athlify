# Athlify Frontend – Copilot learnings

This list contains verified or explicitly agreed rules. Mark assumptions as open and do not treat them as facts.

## Verified in the repository

- The current code under `../../../src/GettingStarted` is a Hot Chocolate GraphQL backend prototype; independent frontend code does not yet exist.
- `../../../src/GettingStarted/Program.cs` uses an EF Core in-memory database named `TestDb`, seeds it at startup and maps GraphQL.
- Paging is currently limited to 10 items by default and extended to a maximum of 999 items; the source is `Program.cs`.
- The project uses `net10.0`, nullable reference types and C# language version `preview`; versions are in `../../../src/GettingStarted/GettingStarted.csproj`.
- The current project tree has no complete product structure for Auth, Activities, Dashboard, Garage, Body-Stats and Events. New product functions must close this gap deliberately and incrementally.

## Durable domain rules

- The user interface is bilingual (German/English), while documentation is English-only and frontend code and technical identifiers are written in English.
- The root concept remains technology-independent.
- Technical details belong in `../../concept/` or suitable source-adjacent documentation.
- Personal data is always read and changed in the context of the logged-in user.
- Dashboard filters apply to metrics, charts, activity timelines and Events.
- Deleted Strava activities must not be automatically reactivated by synchronization.
- Original activities remain traceable when a merge is created.
- There is no public project/documentation website, demo mode or subscription in the current scope.

## Documentation rules

- Check new domain requirements in `../../athlify_concept.md` first and formulate them there only in domain terms.
- Add new frontend decisions in this directory and shared technical decisions under `../../concept/`.
- For conceptual changes, inspect the entire `docs/` tree for affected frontend, backend and shared documents and keep them synchronized.
- Record Copilot-relevant, verified findings here concisely with a file path.
- Do not add secrets, tokens, passwords or personal example data to these files.
- Run `git diff --check` after Markdown changes.

## Frontend-specific rules

- Components handle presentation and interaction; the backend contract remains the source for persisted data.
- Every data-dependent view defines loading, empty, error and success states.
- Consider keyboard operation, focus management, contrast and understandable labels for every new UI.
- Never store real tokens, credentials or personal activity data in mockups, fixtures or screenshots.

## Open items; do not treat as decided

- TSS calculation when power or heart-rate data is missing.
- Exact Strava mapping of Indoor and Outdoor.
- Free tags versus managed tag selection.
- Exclusivity or multiple membership of an Activity in merges.
- Final persistence, authentication and deployment architecture of the product version.
