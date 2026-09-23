# Athlify Documentation

This is the documentation hub for Athlify. Start with the product and domain
documents below; use the Copilot documentation only when working on code or
maintaining project context.

## Start here

| Document                                             | Purpose                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| [`copilot/PRD.md`](copilot/PRD.md)                   | Canonical product requirements entry point                    |
| [`copilot/SAD.md`](copilot/SAD.md)                   | Canonical architecture entry point                            |
| [`concept/CONCEPT.md`](concept/CONCEPT.md)           | Functional scope, use cases, roadmap and quality requirements |
| [`concept/user_stories.md`](concept/user_stories.md) | User stories, priorities and acceptance criteria              |
| [`GLOSSARY.md`](GLOSSARY.md)                         | Shared domain and user-facing terminology                     |
| [`CONTRIBUTING.md`](CONTRIBUTING.md)                 | Branches, commits, git hooks and documentation rules          |
| [`CONFIGURATION.md`](CONFIGURATION.md)               | Current backend, frontend and tooling configuration           |

## Product and technical documentation

| Area                   | Document                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| Architecture           | [`concept/architecture.md`](concept/architecture.md)               |
| Technology stack       | [`concept/technology-stack.md`](concept/technology-stack.md)       |
| Data model             | [`concept/data-model.md`](concept/data-model.md)                   |
| Activity management    | [`concept/activity-management.md`](concept/activity-management.md) |
| API design             | [`concept/api-design.md`](concept/api-design.md)                   |
| Security               | [`concept/security.md`](concept/security.md)                       |
| Testing and deployment | [`concept/testing-deployment.md`](concept/testing-deployment.md)   |

## Implementation context

The repository contains a Body-Stats GraphQL backend prototype
(`src/backend/`) and a React/TypeScript frontend app shell
(`src/frontend/athlify/`). The AI documentation explains how to work safely
with that current state:

- [`copilot/README.md`](copilot/README.md) — central AI documentation index
- [`copilot/frontend/README.md`](copilot/frontend/README.md) — frontend scope,
  architecture and learnings
- [`copilot/backend/README.md`](copilot/backend/README.md) — backend scope,
  architecture and learnings
- [`copilot/adr/README.md`](copilot/adr/README.md) — cross-cutting architecture decisions
- [`copilot/frontend/adr/README.md`](copilot/frontend/adr/README.md) and
  [`copilot/backend/adr/README.md`](copilot/backend/adr/README.md) —
  area-specific architecture decisions

## Supporting material

These files are not part of the canonical product documentation:

- [`AthlifyV2.html`](AthlifyV2.html) — generated UI mockup
- [`administration/mail_submit-project.md`](administration/mail_submit-project.md)
  — project submission mail

## Document boundaries

- Product and domain requirements belong in `concept/`.
- Shared terminology belongs in `GLOSSARY.md`.
- All AI and frontend/backend implementation context belongs in
  `copilot/`.
- Difficult-to-reverse cross-cutting decisions belong in `copilot/adr/`.
- Generated mockups and administrative material are not part of the
  canonical product documentation path.
