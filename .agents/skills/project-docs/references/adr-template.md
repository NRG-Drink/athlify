# ADR template

**Naming**: `docs/adr/ADR-NNN-short-slug.md` — NNN is zero-padded (001, 002…),
slug is lowercase kebab-case.

**Numbering**: Find the highest existing number in `docs/adr/` and increment
by 1. Start at `ADR-001` if none exist. Never reuse or skip numbers.

Whether a decision earns an ADR is the `domain-modeling` gate
(`references/adr-gate.md` in that skill). This file is only the format.

```markdown
# ADR-NNN: [Decision Title]

**Date**: YYYY-MM-DD
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Deciders**: [Names or roles]

## Context

[What situation or problem forced this decision? What constraints exist?]

## Options Considered

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

[2–3 sentence justification grounded in PRD goals and SAD constraints]

## Consequences

### Positive

- [Outcome]

### Negative / Trade-offs

- [Trade-off accepted]

## Implementation Notes

- [Constraint developers must not deviate from]
- [Key implementation detail]
```
