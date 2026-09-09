---
name: project-docs
description: >
  Canonical docs/ layout for PRD, SAD, ADR, and glossary. Use when the user
  mentions PRD, SAD, ADR, architecture document, product requirements,
  software design document, glossary, or when starting feature planning,
  architectural review, or technical decision-making.
---

# Project documentation

This skill owns the doc **structure** — what exists and the rules that bind
it. `domain-modeling` owns **living maintenance** of the glossary and ADRs
(sharpening terms and capturing decisions as they land).

## Doc root

Docs default to `$ROOT/docs`, but a project may keep them elsewhere — a
different directory, or a **separate documentation repo cloned outside
this one**. `$DOCS` below is that resolved root; resolution order and the
rules for an external root are in
[`references/docs-root.md`](references/docs-root.md).

Those files are authoritative when a project points at them. Do not
duplicate them into `docs/` here unless the user asks to bring docs
in-repo, and never keep two roots alive at once.

## Canonical structure

```
$DOCS/
├── PRD.md       # Product Requirements — scope and product goals
├── SAD.md       # Software Architecture — system design and tech stack
├── glossary.md  # Ubiquitous language (optional but recommended)
├── personas.md  # Target users — written by `personas` (optional)
└── adr/
    ├── ADR-001-*.md
    └── ADR-002-*.md
```

`glossary.md` is optional for a throwaway, recommended for anything that
outlives a session.

## Load docs before design work

Check for project documentation before architecture, feature planning, or
implementation planning. Resolve `$DOCS` first
([`references/docs-root.md`](references/docs-root.md)), and follow any
path named in the repo's `AGENTS.md`.

```
$DOCS/PRD.md      — product scope and feature boundaries
$DOCS/SAD.md      — existing architecture, components, tech stack
$DOCS/glossary.md — ubiquitous language
$DOCS/personas.md — who the UI is for (`personas`)
$DOCS/adr/        — prior architectural decisions
```

Report what was found, then continue. When docs are missing: note the
absence, offer to scaffold from the templates below, and do not block.

```
Context loaded (DOCS: ../product-docs):
- PRD.md      ✓ found
- SAD.md      ✓ found
- glossary.md ✓ 42 terms
- personas.md ✓ 2 personas
- adr/        ✓ 3 ADRs (ADR-001, ADR-002, ADR-003)
```

## Write docs when decisions are made

| Trigger                           | Action                                                                     |
|-----------------------------------|----------------------------------------------------------------------------|
| New architectural decision        | Create `$DOCS/adr/ADR-NNN-slug.md` (`domain-modeling` gate decides _when_) |
| SAD component added or changed    | Update `$DOCS/SAD.md`                                                      |
| New feature scope confirmed       | Update `$DOCS/PRD.md` feature list                                         |
| ADR superseded                    | Mark old ADR `Status: Superseded by ADR-NNN`                               |
| Term defined, sharpened, or split | Update `$DOCS/glossary.md` via `domain-modeling`                           |
| Target users named or revised     | Update `$DOCS/personas.md` via `personas`                                  |

## Binding rules

1. **PRD is scope-authoritative** — flag work outside PRD scope before proceeding.
2. **SAD is architecture-authoritative** — decisions that contradict the SAD
   require a new ADR that explicitly supersedes prior ones.
3. **ADRs are binding** — an `Accepted` ADR constrains future decisions in
   that space.
4. **Superseding requires a new ADR** — do not silently override a prior ADR.
5. **An external doc root is a separate repo** — write the file, then tell
   the user to commit it there. Never commit or push on their behalf.

## Document purposes

- **PRD.md** — what the product does, for whom, and why; authoritative for scope.
- **SAD.md** — structure, components, data flows, technology choices;
  authoritative for architecture.
- **glossary.md** — ubiquitous language; each term once, linked to the
  ADR/feature that governs it.
- **personas.md** — 1–2 target users; agent context, not a PM document.
  `personas` owns the file; PRD "Target Users" references it.
- **ADR** — one architectural decision: context, options, rationale, consequences.

## Division of labour

- `project-docs` owns **templates and structure** (`prd-template.md`,
  `sad-template.md`, `adr-template.md`, `glossary-template.md`).
- `domain-modeling` owns **when** an ADR is warranted and **how** the
  glossary stays sharp.
- `personas` owns **who** the product is for (`$DOCS/personas.md`).

Do not duplicate ADR/glossary format into `domain-modeling`, or persona
format into this skill; link out.

## Templates

- [`references/prd-template.md`](references/prd-template.md)
- [`references/sad-template.md`](references/sad-template.md)
- [`references/adr-template.md`](references/adr-template.md)
- [`references/glossary-template.md`](references/glossary-template.md)
- [`references/learnings-template.md`](references/learnings-template.md)
- [`references/docs-root.md`](references/docs-root.md) — where docs live
