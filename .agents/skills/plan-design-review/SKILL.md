---
name: plan-design-review
description: >
  Senior-designer review of a plan or UI. Rates hierarchy, type, color,
  spacing, motion, copy, responsiveness, distinctiveness, and persona fit
  0-10, then records the plan edits to get there. Detects AI slop. Use when
  the user says "design review the plan", "is this UI any good", or "check
  the design".
---

# Design review (plan)

Plan stage. Invoke when the thing being built has a user-facing surface
and you want taste applied _before_ implementation.

## Planning-only guardrail

Do not implement. Do not edit source files, create UI code, run mutating
app commands, or commit. Writing
`.agents/planning/<branch>/03-design-review.md` is in scope.

After writing the artifact, hand off to the host's native Plan mode.
Stop until the user starts Build.

## Preamble (run first)

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "not a git repo"; exit 1; }
BRANCH=$(git branch --show-current 2>/dev/null || echo detached)
SAFE=$(printf '%s' "$BRANCH" | tr '/:' '--' | tr -c 'A-Za-z0-9._-' '-')
PLAN="$ROOT/.agents/planning/$SAFE"
mkdir -p "$PLAN"
DOCS="$ROOT/docs"
for f in .agents/docs-root .agents/docs-root.local; do
  [ -f "$ROOT/$f" ] && DOCS=$(tr -d '\r' < "$ROOT/$f" | sed -n '1p')
done
[ -n "$AI_DOCS_ROOT" ] && DOCS="$AI_DOCS_ROOT"
case "$DOCS" in /*|[A-Za-z]:/*|[A-Za-z]:\\*) ;; *) DOCS="$ROOT/$DOCS" ;; esac
[ -d "$DOCS" ] && DOCS=$(CDPATH= cd -- "$DOCS" && pwd)
case "$DOCS" in "$ROOT"/*) DOCS_EXTERNAL=no ;; *) DOCS_EXTERNAL=yes ;; esac
case "$DOCS" in *"/../"*|*"/..") DOCS_EXTERNAL=yes ;; esac
echo "BRANCH: $BRANCH"
echo "PLAN: $PLAN"
echo "DOCS: $DOCS (external: $DOCS_EXTERNAL)"
[ -d "$DOCS" ] || echo "DOCS: not found — continuing without project docs"
[ -f "$PLAN/01-ceo-review.md" ] && echo "--- 01-ceo-review.md ---" && cat "$PLAN/01-ceo-review.md"
[ -f "$DOCS/personas.md" ] && cat "$DOCS/personas.md"
```

`DOCS` is the project's doc root, not always `docs/` — see
[`project-docs/references/docs-root.md`](../project-docs/references/docs-root.md).

If `$DOCS/personas.md` is present, score Persona-fit. If absent, mark that
dimension `N/A` — never block, and never invent users. Offer `personas`.

Follow `css-conventions` for layout and spacing defaults.

## Method

Rate each dimension **0-10**, state what a **10** looks like, and propose
the specific edit to get there. One question per real design fork;
recommended option first.

1. **Hierarchy & layout** — does the eye land where it should?
2. **Typography** — scale, rhythm, line length, weight contrast.
3. **Color & contrast** — intentional palette, accessible contrast, dark mode.
4. **Spacing & density** — consistent scale, breathing room, alignment.
5. **Motion & feedback** — loading, empty, error, success states all designed.
6. **Copy** — clear, specific, human; no lorem, no filler.
7. **Responsiveness** — real reflow, not just "fits at one width".
8. **Distinctiveness** — a point of view, or generic AI slop?
9. **Persona fit** — cite the persona by name, or `N/A`.

### AI slop detection

Flag: centered everything, identical card grids, purple gradients by
default, emoji as decoration, vague microcopy, no empty/error states,
layouts that break on resize.

## Output

Write `$PLAN/03-design-review.md`: per-dimension scores, the target for
each, and the concrete plan changes. Source-code changes are out of scope.

Next: host-native implementation plan, then stop before Build.
