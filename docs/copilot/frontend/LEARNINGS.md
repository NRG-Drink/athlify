# Athlify Frontend – Copilot Learnings

This file records durable, evidence-backed frontend knowledge. Planned
behavior belongs in the concept and PRD; implemented behavior is confirmed
against source code and tests.

Each entry uses the shared format:

`YYYY-MM-DD - \`scope\` \`status\` Rule. Why: why it matters. Evidence: source.`

See the [shared learnings template](../../../.agents/skills/project-docs/references/learnings-template.md).

## Learnings

- 2026-09-16 - `frontend` `verified` The current checkout contains a React/Vite JavaScript scaffold under `src/frontend/athlify/`, but no Athlify product behavior or backend integration. Why: New UI work must distinguish the existing template shell from implemented domain functionality. Evidence: [`package.json`](../../../src/frontend/athlify/package.json), [`App.jsx`](../../../src/frontend/athlify/src/App.jsx).
- 2026-09-15 - `frontend` `durable-rule` The frontend owns presentation and interaction but consumes backend-owned data shapes, calculations, authorization and synchronization behavior. Why: Duplicating domain rules in components creates divergent values and unsafe assumptions about personal data. Evidence: [`SAD.md`](SAD.md), [`../backend/SAD.md`](../backend/SAD.md).
- 2026-09-15 - `frontend` `durable-rule` Every data-dependent view distinguishes loading, empty, error and populated states, and every action provides clear feedback. Why: Empty or failed requests must not look like successful zero-valued data. Evidence: [`SAD.md`](SAD.md), [`PRD.md`](PRD.md).
- 2026-09-15 - `frontend` `durable-rule` The UI supports German and English while documentation, source code, routes, identifiers and technical terms remain in English. Why: Translation resources can handle visible text without making domain contracts or code identifiers ambiguous. Evidence: [`README.md`](README.md), [`../../GLOSSARY.md`](../../GLOSSARY.md).
- 2026-09-15 - `frontend` `durable-rule` The initial frontend scaffold belongs under `src/frontend` and contains only a React/TypeScript/Vite app shell; it must not introduce API, routing, persistence or domain behavior. Why: This creates a reversible frontend seam without prematurely fixing backend contracts or product flows. Evidence: `.agents/planning/feature-concept/02-eng-review.md`, [`../../concept/technology-stack.md`](../../concept/technology-stack.md).
- 2026-09-15 - `cross-cutting` `durable-rule` Functional product documentation remains under `docs/concept/`, while the configured AI documentation root is `docs/copilot/`. Why: Contributors need a separate functional source of truth and one configured location for implementation context. Evidence: [`.agents/docs-root`](../../../.agents/docs-root), [`../../README.md`](../../README.md), [`../README.md`](../README.md).
- 2026-09-16 - `frontend` `verified` TypeScript is now production-ready: compiler installed, `tsc -b` gates the build (using project-reference composite mode), and ESLint covers `.ts/.tsx` files. Why: Type errors now fail the build before Vite; strict mode catches issues at edit time and build time. Evidence: `src/frontend/athlify/package.json` build script, `tsconfig*.json` composite mode, `eslint.config.js` TypeScript coverage.
- 2026-09-16 - `frontend` `verified` TailwindCSS v4 is the chosen styling framework; uses `@tailwindcss/vite` plugin and CSS-first `@import "tailwindcss"` directive. No `postcss.config.js` or `tailwind.config.js` needed for defaults. Why: Vite plugin approach is lighter, automatic content scanning, and tree-shaking works by default. Evidence: `src/frontend/athlify/vite.config.ts`, `src/frontend/athlify/src/index.css`.
- 2026-09-16 - `frontend` `open` Routing, state strategy, and representations for missing-data TSS, Indoor/Outdoor, tags and merge membership remain undecided. Why: These choices affect API adapters, inputs, filters and component boundaries. Evidence: [`SAD.md`](SAD.md), [`PRD.md`](PRD.md), [`../../concept/activity-management.md`](../../concept/activity-management.md).
