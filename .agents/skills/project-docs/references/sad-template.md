# SAD.md template

Copy into `docs/SAD.md`. Use `codebase-design` vocabulary for components
(module, interface, seam).

```markdown
# Software Architecture Document

**Project**: [Project name]
**Last Updated**: YYYY-MM-DD
**Version**: 1.0

## Overview

[2–3 sentences describing the system at the highest level]

## Architecture Style

[Monolith / Modular Monolith / Microservices / Serverless / Event-Driven]

## System Components

    [ASCII or mermaid diagram of major components and their relationships]

## Technology Stack

| Layer    | Technology | Rationale |
| -------- | ---------- | --------- |
| Frontend |            |           |
| Backend  |            |           |
| Database |            |           |
| Auth     |            |           |
| Hosting  |            |           |

## Key Components

### [Component Name]

- **Responsibility**: [What it does]
- **Interfaces**: [How other components interact with it]
- **Data ownership**: [What data it owns]

## Data Flow

[How data moves through the system for key operations]

## External Integrations

| Service | Purpose | Authentication |
| ------- | ------- | -------------- |
|         |         |                |

## Security Model

- Authentication: [Approach]
- Authorization: [Approach]
- Secrets management: [Approach]

## Scalability

- Current capacity: [Users / requests / data volume]
- Scaling strategy: [Horizontal / vertical / hybrid]
- Known bottlenecks: [If any]

## ADR References

See `docs/adr/` for architectural decision records.
```
