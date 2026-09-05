# Athlify Frontend – Copilot documentation

These files provide GitHub Copilot with the project context required for safe and consistent changes. They are not an additional domain specification, but a compact working index.

## Source hierarchy

When statements conflict, use this order:

1. The user's concrete task.
2. `../../../AGENTS.md` and `.agents/` for working rules.
3. [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md) for the functional scope.
4. The concept documents for technical decisions.
5. The existing frontend code for the actually implemented state.
6. These files as summarized frontend context.

If a requirement is not supported by these sources, do not invent a function. Document the gap as an open question or technical decision.

## Files

| File | Purpose |
|---|---|
| [`PRD.md`](PRD.md) | Product scope, priorities, acceptance criteria and explicit non-goals |
| [`SAD.md`](SAD.md) | Frontend architecture, UI states and boundaries for code changes |
| [`../../GLOSSARY.md`](../../GLOSSARY.md) | Shared binding terminology; update it in the same change when adding terminology |
| [`LEARNINGS.md`](LEARNINGS.md) | Verified findings and recurring pitfalls; actively review it at the end of every task and maintain it when new durable learnings arise |

## Rules for Copilot

- The application is bilingual: German and English. Documentation under `docs/` is English-only; code, identifiers, API names and technical terms are written in English.
- Keep functional requirements in the root concept technology-independent.
- Document framework, database, API and persistence details in `../../concept/` or in the code, not in the root concept.
- The frontend consumes the backend contract; it must not duplicate domain rules only in components or guess backend data models.
- Every view needs loading, empty, error and success states. Actions must provide clear feedback to users.
- Responsive layouts, keyboard operation, sufficient contrast and understandable labels are part of domain quality.
- Check the existing structure and conventions first; do not introduce a new architecture alongside the existing one.
- The project is a two-person open-source student project. Changes must remain small, traceable and realistic to implement.
- Personal training, body and Event data always belongs to the logged-in user. Never mix data between users.
- Do not add a public project or documentation website, demo mode or subscription feature to the implicit scope.
- When changing a domain function, check the affected user stories and technical detail documents for consistency.
- Check documentation changes with `git diff --check`; for code changes, use the tests and build commands already present in the repository.
- At the end of every task, check whether a new, verified and durable frontend learning has emerged. If so, update `LEARNINGS.md` in the same change; otherwise leave it unchanged.
- For conceptual changes, inspect the entire `docs/` tree and keep affected shared concept documents, user stories, glossary, frontend/backend context and links synchronized.
- For a difficult-to-reverse frontend decision, check the ADR index and create an ADR, or create a new ADR superseding an existing Accepted ADR, without waiting for a separate request.

## Current implementation status

There is currently no independent frontend source code in the repository. `../../../src/GettingStarted` is a .NET/Hot Chocolate backend prototype, not a frontend. New UI structures must not be presented as existing conventions; the choice of a frontend framework must be documented explicitly.
