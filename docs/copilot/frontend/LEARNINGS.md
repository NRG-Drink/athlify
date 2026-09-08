# Athlify Frontend – Copilot Learnings

This file records durable, evidence-backed frontend knowledge. It is not a
second product specification. Planned behavior belongs in the concept and
PRD; implemented behavior is confirmed against source code and tests.

## Entry format

Every active entry contains:

- **Status**: `verified`, `durable-rule`, `pitfall`, `procedure`, `open` or
  `superseded`
- **Scope**: `frontend`, `backend` or `cross-cutting`
- **Rule**: one precise statement
- **Why it matters**: the future decision or failure it prevents
- **Evidence**: file, line, command, test or ADR
- **Recorded**: date of confirmation

## Durable rules

### The frontend is not currently implemented

- **Status**: durable-rule
- **Scope**: frontend
- **Rule**: There is no independent frontend source code in the repository;
  `src/GettingStarted` is backend prototype code.
- **Why it matters**: New UI structures must not be described as existing
  conventions or validated against backend prototype files.
- **Evidence**: [`SAD.md`](SAD.md), current repository source tree
- **Recorded**: 2026-09-08

### The frontend consumes the backend contract

- **Status**: durable-rule
- **Scope**: cross-cutting
- **Rule**: The frontend owns presentation and interaction but must consume
  backend-owned data shapes, calculations, authorization and synchronization
  behavior.
- **Why it matters**: Duplicating domain rules in components creates divergent
  values and unsafe assumptions about personal data.
- **Evidence**: [`SAD.md`](SAD.md), [`../backend/SAD.md`](../backend/SAD.md)
- **Recorded**: 2026-09-08

### Data-dependent views expose explicit states

- **Status**: durable-rule
- **Scope**: frontend
- **Rule**: Every data-dependent view distinguishes loading, empty, error and
  populated states.
- **Why it matters**: Empty or failed requests must not look like successful
  zero-valued data.
- **Evidence**: [`SAD.md`](SAD.md), [`PRD.md`](PRD.md)
- **Recorded**: 2026-09-08

### UI language and implementation language are separate

- **Status**: durable-rule
- **Scope**: frontend
- **Rule**: The UI supports German and English, while documentation, source
  code, routes, identifiers and technical terms remain in English.
- **Why it matters**: Translation resources must handle visible text without
  making domain contracts or code identifiers ambiguous.
- **Evidence**: [`README.md`](README.md), [`../../GLOSSARY.md`](../../GLOSSARY.md)
- **Recorded**: 2026-09-08

## Verified implementation findings

### The repository currently exposes a backend prototype only

- **Status**: verified
- **Scope**: frontend
- **Rule**: The current source tree contains `src/GettingStarted` with
  GraphQL/Hot Chocolate and no frontend package or source tree.
- **Why it matters**: Frontend planning must begin with an explicit framework
  and folder decision rather than inferred conventions.
- **Evidence**: `find src -maxdepth 4 -type f`, [`../backend/SAD.md`](../backend/SAD.md)
- **Recorded**: 2026-09-08

## Open items

### AI context is separate from user documentation

- **Status**: durable-rule
- **Scope**: cross-cutting
- **Rule**: User-facing product documentation remains directly under `docs/`,
  while all AI implementation context is organized below `docs/copilot/`.
- **Why it matters**: Contributors can find product scope without navigating
  agent-specific files, while AI work still has a single implementation entry
  point.
- **Evidence**: [`../../README.md`](../../README.md),
  [`../README.md`](../README.md)
- **Recorded**: 2026-09-08

### Frontend technology and structure

- **Status**: open
- **Scope**: frontend
- **Question**: Which frontend framework, bundler, folder structure and state
  strategy will be selected?
- **Why it matters**: This choice affects routing, API adapters, testing and
  component boundaries.
- **Evidence**: [`SAD.md`](SAD.md)
- **Recorded**: 2026-09-08
- **Closure**: Record the reviewed choice in the shared technology document
  and a frontend ADR if it is difficult to reverse.

### Domain decisions pending backend contract

- **Status**: open
- **Scope**: cross-cutting
- **Question**: How are missing-data TSS, Indoor/Outdoor, tags and merge
  membership represented?
- **Why it matters**: The frontend cannot safely design inputs or filters
  until the backend contract is explicit.
- **Evidence**: [`PRD.md`](PRD.md), [`../../concept/activity-management.md`](../../concept/activity-management.md)
- **Recorded**: 2026-09-08
- **Closure**: Resolve in the shared concept and backend contract first.
