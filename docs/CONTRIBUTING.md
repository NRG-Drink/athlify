# Contributing to Athlify

Athlify is a private, two-person student project hosted on GitHub. This guide
describes the working agreements observed in the repository. The binding
rules for documentation and AI-assisted work are in [`AGENTS.md`](../AGENTS.md).

## Branches and pull requests

- `main` is the default branch. `develop` is the integration branch.
- Create a branch from `develop` for every change and open a pull request
  back into `develop`. The other team member reviews it.
- Branch prefixes used so far: `feature/<topic>` or `feat/<topic>` for
  features, `poc/<topic>` for throw-away experiments, and author-prefixed
  variants such as `me_feat/<topic>`. The team has not settled on one
  convention yet.
- How `develop` is promoted to `main` has not been defined yet.

## Commit messages

Use a short conventional prefix followed by an imperative summary, as in the
existing history: `feat:`, `chore:`, `test:`, `deps:`, `docs:`.

## Local checks

The frontend is a standalone npm package: run `npm install` in
`src/frontend/athlify/`. There is no `package.json` in the repository root.
The project uses no git hooks, so run the checks yourself before committing:

```bash
cd src/frontend/athlify
npm test              # frontend tests (Vitest)
npm run typecheck
npm run lint
npm run build
cd ../../..
dotnet run --project src/backend/Athlify.Api.Tests   # backend tests (TUnit)
```

## Documentation

- Keep the [functional concept](concept/CONCEPT.md), the technical concept
  documents, the [Copilot documentation](copilot/README.md) and the
  [glossary](GLOSSARY.md) consistent with every change.
- Record difficult-to-reverse decisions as ADRs. Numbers form one sequence
  across the [shared](copilot/adr/README.md),
  [frontend](copilot/frontend/adr/README.md) and
  [backend](copilot/backend/adr/README.md) ADR directories.
- Record verified, durable findings in the frontend or backend
  `LEARNINGS.md`.
- Documentation is English-only. The UI is German and English. Code and
  identifiers are English.
- For documentation changes, run `git diff --check` and check that changed
  relative links resolve.
- Link every new file under `docs/` from the [root README](../README.md)
  and the [documentation hub](README.md).
