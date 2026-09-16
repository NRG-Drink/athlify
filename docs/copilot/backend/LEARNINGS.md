# Athlify Backend – Copilot Learnings

This file records durable, evidence-backed backend knowledge. Planned
behavior belongs in the concept and PRD; implemented behavior is confirmed
against source code and tests.

Each entry uses the shared format:

`YYYY-MM-DD - \`scope\` \`status\` Rule. Why: why it matters. Evidence: source.`

See the [shared learnings template](../../../.agents/skills/project-docs/references/learnings-template.md).

## Learnings

- 2026-09-15 - `backend` `verified` The current checkout contains no backend implementation, dependency manifest, test project or deployment configuration; `src/.gitkeep` is the only source-tree file. Why: Backend behavior in the concept and SAD must remain explicitly planned until implementation exists. Evidence: `find src -maxdepth 3 -type f`, [`../../concept/CONCEPT.md`](../../concept/CONCEPT.md).
- 2026-09-15 - `backend` `durable-rule` Authentication, authorization, ownership checks, persistence, calculations, synchronization and the API contract belong to the backend. Why: Client-side checks cannot protect personal data or provide a reliable source for calculated values. Evidence: [`SAD.md`](SAD.md), [`../../concept/security.md`](../../concept/security.md).
- 2026-09-15 - `backend` `durable-rule` Strava synchronization must keep internal and external IDs distinct, avoid duplicate records, report failures explicitly and never reactivate soft-deleted activities. Why: Repeated imports must not corrupt a user's history or undo an intentional deletion. Evidence: [`../../concept/activity-management.md`](../../concept/activity-management.md), [`../../concept/api-design.md`](../../concept/api-design.md).
- 2026-09-15 - `cross-cutting` `durable-rule` Every personal query, mutation and synchronization must enforce the authenticated owner context server-side. Why: UI filtering is not an authorization boundary. Evidence: [`SAD.md`](SAD.md), [`../../concept/security.md`](../../concept/security.md).
- 2026-09-15 - `cross-cutting` `durable-rule` Functional product documentation remains under `docs/concept/`, while the configured AI documentation root is `docs/copilot/`. Why: Contributors need a separate functional source of truth and one configured location for implementation context. Evidence: [`.agents/docs-root`](../../../.agents/docs-root), [`../../README.md`](../../README.md), [`../README.md`](../README.md).
- 2026-09-15 - `cross-cutting` `procedure` Documentation changes require `git diff --check` and validation of changed relative Markdown links. Why: Broken context links directly reduce agent reliability. Evidence: [`../../../AGENTS.md`](../../../AGENTS.md).
- 2026-09-15 - `backend` `open` Final persistence, authentication and deployment choices remain undecided, as do missing-data TSS, Indoor/Outdoor mapping, tag ownership and merge membership. Why: These decisions affect the API contract, data model and synchronization behavior. Evidence: [`SAD.md`](SAD.md), [`../../concept/technology-stack.md`](../../concept/technology-stack.md), [`../../concept/activity-management.md`](../../concept/activity-management.md).
