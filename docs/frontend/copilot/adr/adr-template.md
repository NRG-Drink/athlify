# Frontend ADR Template

Copy this file when creating a new frontend ADR. Do not edit this template in
place.

**File name**: `docs/frontend/copilot/adr/ADR-NNN-short-slug.md`

Use a zero-padded number (`001`, `002`, …) and a lowercase kebab-case slug.
Find the highest existing frontend ADR number and increment it. Never reuse a
number. Frontend ADRs cover decisions about UI architecture, frontend
frameworks, routing, state management, design systems, accessibility
patterns and API-consumption strategies.

Do not use this template for backend or shared technical decisions:

- Backend decisions belong in
  `docs/backend/copilot/adr/`.
- Shared decisions belong in `docs/concept/`.
- Functional requirements belong in `docs/athlify_concept.md`.

```markdown
# ADR-NNN: [Decision title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Deciders**: [Names or roles]

## Context

[What frontend problem or constraint requires a decision? Reference the
relevant product requirement or shared technical document.]

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

[Explain the choice and how it supports Athlify's product goals, usability,
accessibility and the backend contract.]

## Consequences

### Positive

- [Outcome]

### Negative / trade-offs

- [Trade-off accepted]

## Implementation notes

- [Constraint future frontend changes must follow]
- [Relevant UI, API or accessibility detail]

## Related documentation

- [Link to the relevant SAD, PRD, API contract or shared concept document]
```
