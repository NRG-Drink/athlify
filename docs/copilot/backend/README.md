# Athlify Backend – Copilot documentation

These files provide GitHub Copilot with the project context required for safe
and consistent changes. They are not an additional domain specification, but a
compact working index.

Start with the repository-wide [AI documentation index](../README.md)
for source authority, loading order and update triggers.

## Source hierarchy

When statements conflict, use this order:

1. The user's concrete task.
2. `../../../AGENTS.md` and `.agents/` for working rules.
3. [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md) for the functional scope.
4. The concept documents for technical decisions.
5. The existing backend code for the actually implemented state.
6. These files as summarized backend context.

If a requirement is not supported by these sources, do not invent a function. Document the gap as an open question or technical decision.

## Files

| File | Purpose |
|---|---|
| [`PRD.md`](PRD.md) | Product scope, priorities, acceptance criteria and explicit non-goals |
| [`SAD.md`](SAD.md) | Current technical state, target architecture and boundaries for code changes |
| [`../../GLOSSARY.md`](../../GLOSSARY.md) | Shared binding terminology; update it in the same change when adding terminology |
| [`LEARNINGS.md`](LEARNINGS.md) | Verified findings and recurring pitfalls; actively review it at the end of every task and maintain it when new durable learnings arise |
| [`../adr/README.md`](../adr/README.md) | Shared cross-cutting architecture decisions |

## Rules for Copilot

- The application is bilingual: German and English. Documentation under `docs/` is English-only; code, identifiers, API names and technical terms are written in English.
- Keep functional requirements in the root concept technology-independent.
- Document framework, database, API and persistence details in `../../concept/` or in the code, not in the root concept.
- Check the existing structure and conventions first; do not introduce a new architecture alongside the existing one.
- The project is a two-person open-source student project. Changes must remain small, traceable and realistic to implement.
- Personal training, body and Event data always belongs to the logged-in user. Never mix data between users.
- The backend contract is the source for data shapes, calculations and error cases consumed by the frontend.
- When adding or changing API, domain, data-model, integration or security terms, update `../../GLOSSARY.md` in the same change.
- Do not add a public project or documentation website, demo mode or subscription feature to the implicit scope.
- When changing a domain function, check the affected user stories and technical detail documents for consistency.
- At the end of every task, check whether a new, verified and durable backend learning has emerged. If so, update `LEARNINGS.md` in the same change; otherwise leave it unchanged.
- For conceptual changes, inspect the entire `docs/` tree and keep affected shared concept documents, user stories, glossary, frontend/backend context and links synchronized.
- For a difficult-to-reverse backend decision, check the ADR index and create an ADR, or create a new ADR superseding an existing Accepted ADR, without waiting for a separate request.
- Check documentation changes with `git diff --check`; for code changes, use the tests and build commands already present in the repository.

## Current implementation status

The source code currently contains a small GraphQL/Hot Chocolate getting-started project under `../../../src/GettingStarted`. It is a technical prototype, not the complete Athlify functionality from the concept. Copilot must not silently present the prototype as an implemented product function.
