# Backend ADR Template

Copy this file when creating a new backend ADR. Do not edit this template in
place.

**File name**: `docs/backend/copilot/adr/ADR-NNN-short-slug.md`

Use a zero-padded number (`001`, `002`, …) and a lowercase kebab-case slug.
Find the highest existing backend ADR number and increment it. Never reuse a
number. Backend ADRs cover decisions about the API/GraphQL contract,
authentication and authorization, ownership checks, persistence, domain
calculations, external integrations, synchronization and deployment.

Do not use this template for frontend or shared technical decisions:

- Frontend decisions belong in
  `docs/frontend/copilot/adr/`.
- Shared decisions belong in `docs/concept/`.
- Functional requirements belong in `docs/athlify_concept.md`.

```markdown
# ADR-NNN: [Decision title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Deciders**: [Names or roles]

## Context

[What backend problem or constraint requires a decision? Reference the
relevant product requirement, API contract or shared technical document.]

## Options considered

### Option 1: [Name]

- Pros: [...]
- Cons: [...]

### Option 2: [Name]

- Pros: [...]
- Cons: [...]

### Option 3: [Name] _(if applicable)_

- Pros: [...]
- Cons: [...]

## Decision

**Chosen**: Option N — [Name]

[Explain the choice and how it supports Athlify's product goals, security,
data ownership, consistency and frontend contract.]

## Consequences

### Positive

- [Outcome]

### Negative / trade-offs

- [Trade-off accepted]

## Implementation notes

- [Constraint future backend changes must follow]
- [Relevant schema, persistence, security or integration detail]

## Related documentation

- [Link to the relevant SAD, PRD, API contract or shared concept document]
```
