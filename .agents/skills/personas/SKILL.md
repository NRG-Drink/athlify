---
name: personas
description: >
  Capture 1–2 concrete target personas as a committed personas.md in the
  project's doc root (docs/personas.md by default)
  that plan-design-review and build agents load. Use when the user says
  "who are we building for", "define the persona", "create personas",
  "target user", or starts UI work without a user model.
---

# Personas

Plan stage. Invoke when a project has a user-facing surface and no written
model of _who_ it is for — before `plan-design-review` or an agent builds
UI. Captures **1–2 concrete personas** into `$DOCS/personas.md`.

A persona is **agent context**: a terse, machine-loadable constraint that
stops build agents from defaulting to generic AI-slop UI. "Good _for this
user_" is something an agent can act on; "good design" is not.

`project-docs`'s PRD "Target Users" section references this file. Do not
duplicate it there.

## Preamble (run first)

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "not a git repo"; exit 1; }
DOCS="$ROOT/docs"
for f in .agents/docs-root .agents/docs-root.local; do
  [ -f "$ROOT/$f" ] && DOCS=$(tr -d '\r' < "$ROOT/$f" | sed -n '1p')
done
[ -n "$AI_DOCS_ROOT" ] && DOCS="$AI_DOCS_ROOT"
case "$DOCS" in /*|[A-Za-z]:/*|[A-Za-z]:\\*) ;; *) DOCS="$ROOT/$DOCS" ;; esac
[ -d "$DOCS" ] && DOCS=$(CDPATH= cd -- "$DOCS" && pwd)
case "$DOCS" in "$ROOT"/*) DOCS_EXTERNAL=no ;; *) DOCS_EXTERNAL=yes ;; esac
case "$DOCS" in *"/../"*|*"/..") DOCS_EXTERNAL=yes ;; esac
echo "ROOT: $ROOT"
echo "DOCS: $DOCS (external: $DOCS_EXTERNAL)"
[ -f "$DOCS/personas.md" ] && echo "--- existing personas.md ---" && cat "$DOCS/personas.md"
[ -f "$DOCS/PRD.md" ] && echo "--- PRD.md ---" && cat "$DOCS/PRD.md"
```

`DOCS` is the project's doc root — `docs/` by default, elsewhere (even a
separate repo) when the project says so. See
[`project-docs/references/docs-root.md`](../project-docs/references/docs-root.md).

`personas.md` is project-level, not feature-scoped — a persona is
usually shared across features.

If the file already exists, show it and confirm the user wants to update
it before overwriting. Never clobber silently. If the user named a
persona, start the interview there.

## Method

One question at a time. Recommended answer first. Read the PRD and
existing UI before asking.

1. **Anchor on a real person.** A specific, real (or realistically
   specific) person — not "power users." A recent moment, a device, a
   context. Reject hypotheticals.
2. **Goals, ranked.** What they are actually trying to accomplish, in
   order.
3. **Anti-goals / frustrations.** What must NOT happen; what they hate.
   Often more design-actionable than the goals.
4. **Design implications.** One line that tells an agent what this means
   for the UI (density, tone, entry point, defaults).

Cap at **2 personas**. If the user wants more, push back — the value is a
tight model, not a cast. Two-sided products (buyer + seller) are the
ceiling.

## Output

Write `$DOCS/personas.md`. Create the directory only when `$DOCS` is the
default `$ROOT/docs`; a configured root that does not exist means the docs
repo is not cloned — say so and stop, do not `mkdir` a decoy. It must live at the
project's doc root — that is the path `plan-design-review` reads. Show the
composed file and confirm before writing.

After writing, tell the user to commit it. When `DOCS_EXTERNAL=yes` the
file landed in a **different git repo** that `ship` never sees: print the
absolute path and say it must be committed there. Do not `git add`,
commit, or push in that repo.

```markdown
# Personas

_Who this product is for. Loaded by plan-design-review and build agents.
Keep terse — this is agent context, not a PM document._

## <Persona name> — <one-line who they are>

- **Context:** <situation / device / when they show up>
- **Goals:** <what they're trying to accomplish, ranked>
- **Frustrations / anti-goals:** <what must NOT happen; what they hate>
- **Design implications:** <what this means for the UI — the line agents act on>
```

Durable insights: one dated line in `$DOCS/LEARNINGS.md`.

Next: `plan-design-review` scores a **Persona fit** dimension against
this file.
