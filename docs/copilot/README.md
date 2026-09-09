# Athlify AI Documentation

This is the repository-local entry point for AI-assisted engineering work.
The documentation is intentionally split between shared product context and
frontend/backend implementation context.

For the user-facing documentation overview, start with the
[documentation hub](../README.md). This index is for implementation work and
AI context.

## Source hierarchy

When statements conflict, use this order:

1. The user's concrete task.
2. `AGENTS.md` and repository-local `.agents/` rules.
3. This document for documentation navigation and ownership.
4. [`../concept/CONCEPT.md`](../concept/CONCEPT.md) for functional scope.
5. The relevant documents under [`../concept/`](../concept/CONCEPT.md).
6. [`../GLOSSARY.md`](../GLOSSARY.md) for shared terminology.
7. The relevant frontend or backend Copilot context.
8. The actual source code and tests for implemented behavior.
9. ADRs for accepted architectural decisions and `LEARNINGS.md` for verified
   operational knowledge.

The concept describes the intended product. Source code describes the current
implementation. The current repository contains a small backend prototype and
no independent frontend source; do not present planned features as complete.

## Documentation map

| Area | Entry point | Responsibility |
|---|---|---|
| Shared product | [`../concept/CONCEPT.md`](../concept/CONCEPT.md) | Functional scope, use cases and quality requirements |
| Shared technical context | [`../concept/`](../concept/CONCEPT.md) | Architecture, data model, API, security and deployment details |
| Shared terminology | [`../GLOSSARY.md`](../GLOSSARY.md) | Binding domain, user-facing and technical terms |
| Shared decisions | [`adr/README.md`](adr/README.md) | Cross-cutting architectural decisions |
| Frontend | [`frontend/README.md`](frontend/README.md) | UI responsibility, interaction and frontend context |
| Backend | [`backend/README.md`](backend/README.md) | API, persistence, ownership and backend context |

## Area-specific loading

### Frontend task

Read the shared concept, glossary and technical documents first, then
[`frontend/README.md`](frontend/README.md), its PRD/SAD,
learnings and ADR index, followed by the backend contract and actual source.

### Backend task

Read the shared concept, glossary and technical documents first, then
[`backend/README.md`](backend/README.md), its PRD/SAD,
learnings and ADR index, followed by the frontend contract and actual source.

### Cross-cutting task

Read both area-specific entry points and the shared ADR index. Treat the API
contract and glossary as the seam between frontend and backend.

## Ownership boundaries

- The shared concept owns product scope and domain language.
- The backend owns authentication, authorization, ownership checks,
  persistence, calculations, synchronization and the API contract.
- The frontend owns navigation, presentation, input, local UI state,
  accessibility and understandable backend error feedback.
- The glossary defines each shared term once; link to it rather than creating
  competing definitions.
- ADRs record difficult-to-reverse decisions with meaningful alternatives.
- Learnings record verified implementation knowledge and explicitly label
  unresolved assumptions as open.

## Update triggers

| Change | Update |
|---|---|
| Product scope or acceptance criteria | Concept and affected user stories/PRDs |
| New or changed domain/API/security term | [`../GLOSSARY.md`](../GLOSSARY.md) |
| Shared architecture decision | [`adr/README.md`](adr/README.md) and a new ADR |
| Frontend boundary or UI decision | Frontend SAD and frontend ADR when warranted |
| Backend contract, persistence, auth or sync decision | Backend SAD, shared technical docs and backend ADR when warranted |
| Verified implementation finding | Relevant frontend or backend `LEARNINGS.md` |
| New documentation file | This map and the affected README |

Do not copy complete requirements into AI-only documents. Add links and
ownership guidance instead so that the concept remains authoritative.

## Current implementation status

The backend prototype is under `src/GettingStarted/` and uses ASP.NET Core,
Hot Chocolate GraphQL and EF Core with an in-memory database. It contains
getting-started book/author examples, not the complete Athlify product.
Independent frontend source code is not present yet.
