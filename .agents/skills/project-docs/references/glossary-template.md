# Glossary template

**Location**: `docs/glossary.md` — the project's ubiquitous language.

**Maintenance**: kept alive by `domain-modeling` — terms are added and
sharpened inline as decisions land, never batched.

**Rules**:

- **A glossary and nothing else.** No implementation details, file paths,
  code snippets, schemas, or API shapes. Those belong in the SAD, ADRs, or
  the code.
- **Cross-link every entry** to the ADR / feature / story that governs it.
- **Tags** are optional, in parentheses after the term (e.g. `(legal)`,
  `(deprecated)`). Define the legend in the header.
- **Alphabetical sections** so entries are findable; keep them sorted.
- **Link, don't restate.** When another doc needs a definition, link here.

```markdown
# <Project> — Glossary

> Definitions of the domain, technical, and product terms used across the
> <Project> documentation. When in doubt, link to this file rather than
> redefine a term in place.
>
> Tag legend: **(legal)** plain-English summary of a regulation, not legal
> advice · **(deprecated)** retained for history.

## A — C

**<Term>** — <plain-English definition, one or two sentences>. See
[ADR-NNN](./adr/ADR-NNN-slug.md).

## D — F

**<Term>** — <definition>.

## G — L

...

## M — R

...

## S — Z

...
```

## Entry format

`**Term** — definition. See [link], [link].`

- **Term** in bold; tags in italics immediately after.
- One em dash, then a concise definition.
- Trailing `See …` with cross-links. Omit if genuinely nothing to link yet.

## Splitting overloaded terms

When one word carries two meanings, give each its own entry and
disambiguate in the definition — e.g. **Account (billing)** vs
**Account (login)**.
