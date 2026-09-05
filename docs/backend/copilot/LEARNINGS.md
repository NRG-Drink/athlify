# Athlify Backend – Copilot learnings

This list contains verified or explicitly agreed rules. Mark assumptions as open and do not treat them as facts.

## Verified in the repository

- The current code is under `../../../src/GettingStarted` and is a Hot Chocolate GraphQL prototype, not the complete Athlify application.
- `../../../src/GettingStarted/Program.cs` uses an EF Core in-memory database named `TestDb`, seeds it at startup and maps GraphQL.
- Paging is currently limited to 10 items by default and extended to a maximum of 999 items; the source is `Program.cs`.
- The project uses `net10.0`, nullable reference types and C# language version `preview`; versions are in `../../../src/GettingStarted/GettingStarted.csproj`.
- The current project tree has no complete product structure for Auth, Activities, Dashboard, Garage, Body-Stats and Events. New product functions must close this gap deliberately and incrementally.

## Durable domain rules

- The user interface is bilingual (German/English), while documentation is English-only and backend code and technical identifiers are written in English.
- The root concept remains technology-independent.
- Technical details belong in `../../concept/` or suitable source-adjacent documentation.
- Personal data is always read and changed in the context of the logged-in user.
- Dashboard filters apply to metrics, charts, activity timelines and Events.
- Deleted Strava activities must not be automatically reactivated by synchronization.
- Original activities remain traceable when a merge is created.
- There is no public project/documentation website, demo mode or subscription in the current scope.

## Documentation rules

- Check new domain requirements in `../../athlify_concept.md` first and formulate them there only in domain terms.
- Add new backend decisions in this directory and shared technical decisions under `../../concept/`.
- For conceptual changes, inspect the entire `docs/` tree for affected frontend, backend and shared documents and keep them synchronized.
- Record Copilot-relevant, verified findings here concisely with a file path.
- Do not add secrets, tokens, passwords or personal example data to these files.
- Run `git diff --check` after Markdown changes.

## Backend-specific rules

- Ownership checks are performed server-side in every personal query and mutation.
- Strava synchronization explicitly handles external IDs, duplicates, updates, errors and soft-deleted Activities.
- Calculated values are generated centrally and traceably; the frontend must not store a conflicting calculation as truth.
- Do not place credentials, tokens or personal data in logs, fixtures or documentation.

## Open items; do not treat as decided

- TSS calculation when power or heart-rate data is missing.
- Exact Strava mapping of Indoor and Outdoor.
- Free tags versus managed tag selection.
- Exclusivity or multiple membership of an Activity in merges.
- Final persistence, authentication and deployment architecture of the product version.
