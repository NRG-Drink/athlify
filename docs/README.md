# Athlify Documentation

This is the documentation hub for Athlify. Start with the product and domain
documents below; use the Copilot documentation only when working on code or
maintaining project context.

## Start here

| Document | Purpose |
|---|---|
| [`concept/CONCEPT.md`](concept/CONCEPT.md) | Functional scope, use cases, roadmap and quality requirements |
| [`concept/user_stories.md`](concept/user_stories.md) | User stories, priorities and acceptance criteria |
| [`GLOSSARY.md`](GLOSSARY.md) | Shared domain and user-facing terminology |

## Product and technical documentation

| Area | Document |
|---|---|
| Architecture | [`concept/architecture.md`](concept/architecture.md) |
| Technology stack | [`concept/technology-stack.md`](concept/technology-stack.md) |
| Data model | [`concept/data-model.md`](concept/data-model.md) |
| Activity management | [`concept/activity-management.md`](concept/activity-management.md) |
| API design | [`concept/api-design.md`](concept/api-design.md) |
| Security | [`concept/security.md`](concept/security.md) |
| Testing and deployment | [`concept/testing-deployment.md`](concept/testing-deployment.md) |

## Implementation context

The repository contains a small backend prototype and no independent
frontend source yet. The AI documentation explains how to work safely with
that current state:

- [`copilot/README.md`](copilot/README.md) — central AI documentation index
- [`copilot/frontend/README.md`](copilot/frontend/README.md) — frontend scope,
  architecture and learnings
- [`copilot/backend/README.md`](copilot/backend/README.md) — backend scope,
  architecture and learnings
- [`copilot/adr/README.md`](copilot/adr/README.md) — cross-cutting architecture decisions

## Document boundaries

- Product and domain requirements belong in `concept/`.
- Shared terminology belongs in `GLOSSARY.md`.
- All AI and frontend/backend implementation context belongs in
  `copilot/`.
- Difficult-to-reverse cross-cutting decisions belong in `copilot/adr/`.
- Generated mockups and administrative material are not part of the
  canonical product documentation path.
