---
name: domain-modeling
description: >
  Build and sharpen a project's ubiquitous language. Use when the user pins
  down terminology, mentions a glossary or ubiquitous language, names a new
  concept, or records or revisits an architectural decision. Maintains
  docs/glossary.md and docs/adr/ as decisions land.
---

# Domain modeling

Cross-cutting. Fires when the _language_ of the project is being forged or
a decision is crystallizing — including during `plan-eng-review` and
`code-review` when code and vocabulary disagree.

This is the **active** discipline: challenging terms, sharpening fuzzy
language, and writing the glossary and decisions down the moment they
crystallize. Merely _reading_ `docs/glossary.md` is a one-line habit any
skill can do; this skill is for _changing_ the model.

For doc **structure** (PRD/SAD/ADR layout, binding rules, templates) defer
to `project-docs`. This skill owns _how_ they stay alive.

## File structure

```
$DOCS/
├── glossary.md
└── adr/
    ├── ADR-001-*.md
    └── ADR-002-*.md
```

`$DOCS` is the project's doc root — `docs/` by default, elsewhere (even a
separate repo) when the project says so. Resolve it per
[`project-docs/references/docs-root.md`](../project-docs/references/docs-root.md)
before reading or writing anything below.

If `$DOCS/CONTEXT-MAP.md` exists, the repo has multiple bounded contexts.
The map points to each context's glossary. System-wide decisions stay in
root `$DOCS/adr/`; context-specific decisions live beside their context.

Create files lazily. If no `$DOCS/glossary.md` exists, create it from
`project-docs`'s `glossary-template.md` when the first term is resolved.
If no `$DOCS/adr/` exists, create it when the first ADR is needed.

If the doc root is a separate repo, update _those_ files instead of
inventing a second glossary — and leave committing them to the user.

## During the session

- **Challenge against the glossary.** When a term conflicts with
  `$DOCS/glossary.md`, call it out immediately.
- **Sharpen fuzzy language.** Propose a precise canonical term for vague
  or overloaded words.
- **Discuss concrete scenarios.** Stress-test relationships with specific
  edge cases.
- **Cross-reference with code.** If the user states how something works
  and the code disagrees, surface it.
- **Update the glossary inline.** When a term is resolved, update
  `$DOCS/glossary.md` in the right alphabetical section. Keep it **devoid
  of implementation details**. Format lives in
  [`project-docs/references/glossary-template.md`](../project-docs/references/glossary-template.md).
- **Offer ADRs sparingly.** Only when the decision passes
  [`references/adr-gate.md`](references/adr-gate.md). File format:
  [`project-docs/references/adr-template.md`](../project-docs/references/adr-template.md).

See [`references/glossary-maintenance.md`](references/glossary-maintenance.md)
for the loop and worked examples.

When exploring alternative _shapes_ for a named concept, use
`codebase-design`'s design-it-twice pattern. The name comes from the
domain; the shape comes from that skill.

## Output

Updated `$DOCS/glossary.md` and, when the gate is met, a new
`$DOCS/adr/ADR-NNN-*.md` (status `Proposed`). Durable naming insights: one
dated line in `$DOCS/LEARNINGS.md`.
