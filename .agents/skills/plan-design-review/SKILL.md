---
name: plan-design-review
description: >
  Senior-designer review of a plan or UI. Rates hierarchy, type, color,
  spacing, motion, copy, responsiveness, distinctiveness, and persona fit
  0-10 against the project design system, then records the plan edits to
  get there. Detects AI slop. Use when
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
DS="$DOCS/frontend/DESIGN-SYSTEM.md"
if [ -f "$DS" ]; then echo "--- DESIGN-SYSTEM.md ---"; cat "$DS"; else echo "DESIGN-SYSTEM: not found"; fi
[ -f "$DOCS/frontend/adr/ADR-005-theme-tokens.md" ] && echo "--- ADR-005 ---" && cat "$DOCS/frontend/adr/ADR-005-theme-tokens.md"
THEME="$ROOT/src/frontend/athlify/src/theme"
[ -f "$THEME/semantic.ts" ] && echo "--- theme/semantic.ts ---" && cat "$THEME/semantic.ts"
```

`DOCS` is the project's doc root, not always `docs/` — see
[`project-docs/references/docs-root.md`](../project-docs/references/docs-root.md).

If `$DOCS/personas.md` is present, score Persona-fit. If absent, mark that
dimension `N/A` — never block, and never invent users. Offer `personas`.

## Design system

`$DOCS/frontend/DESIGN-SYSTEM.md` is the benchmark for every score. It names
the tokens, text styles, components and rules of the "Night Ride" theme;
values live in `src/frontend/athlify/src/theme/` (`palette.ts`,
`semantic.ts`, `index.ts`), and ADR-005 records why. Score against these
rules, not against generic taste:

- Every colour in the plan is a semantic token (`bg*`, `fg*`, `border`,
  `brand.*`, `spark.*`, `chart.*`). Flag hex values, raw scale steps and
  Chakra built-in palettes.
- `spark` (orange) only for effort and power data; never buttons, links,
  navigation, errors or warnings. Brand cyan never as light-mode text.
- `volt` only on the brand mark; at most one gradient element per visible
  area; the skewed `indicator` bar marks the active item.
- Totals use `textStyle="kpi"` with unit, `kicker` label and comparison
  period; missing data shows "—", never `0`.
- Reuse the listed components (`Page`, `KpiTile`, `MetricChart`,
  `PeriodPicker`, `DataTable`, `FormDialog`, `ConfirmDialog`) before
  proposing new ones; a new component needs a reason.
- Copy follows the voice section (German first, Swiss spelling, *du*,
  sentence case, no emoji).
- Both colour modes are designed; text 4.5:1 and graphics 3:1 in each.

When a plan needs something the design system does not cover (a new token,
colour meaning or component), say so in the review and propose the addition
to `DESIGN-SYSTEM.md` (and, for a new colour meaning, to ADR-005) as part of
the plan. If `DESIGN-SYSTEM.md` is missing, review against ADR-005 and the
theme files, and note the gap.

Follow `css-conventions` for layout and spacing defaults.

## Method

Rate each dimension **0-10**, state what a **10** looks like, and propose
the specific edit to get there. One question per real design fork;
recommended option first.

1. **Hierarchy & layout** — does the eye land where it should? A few large
   totals first, details on demand; the shell and `Page` frame reused.
2. **Typography** — Barlow `heading` for titles and `kpi`, Inter `body`
   for the rest; the design system's text styles, line length ≤ 65ch.
3. **Color & contrast** — semantic tokens only, the colour meanings above,
   contrast floors met in both modes.
4. **Spacing & density** — the 8px rem rhythm, grid first, gap over margin,
   radii `l1`/`l2`/`l3`.
5. **Motion & feedback** — loading, empty, error, success states all
   designed (`Page` states); 150ms transitions, off under reduced motion.
6. **Copy** — clear, specific, human, in the design system's voice; German
   and English strings planned; no lorem, no filler.
7. **Responsiveness** — real reflow, not just "fits at one width"; the
   phone answers "what did my last ride add?" at a glance.
8. **Distinctiveness** — reads as Athlify (indicator bar, Barlow italic
   numerals, calm navy/cyan), or generic AI slop?
9. **Design-system fit** — tokens, components and rules used as written;
   list every deviation and every proposed addition.
10. **Persona fit** — cite the persona by name, or `N/A`.

### AI slop detection

Flag: centered everything, identical card grids, purple gradients by
default, emoji as decoration, cards with a coloured left border, shadows
for depth, orange used for actions, `0` shown for missing data, vague
microcopy, no empty/error states, layouts that break on resize.

## Output

Write `$PLAN/03-design-review.md`: per-dimension scores, the target for
each, the concrete plan changes, and a **Design-system deltas** list
(deviations to fix, additions to `DESIGN-SYSTEM.md` to propose). Source-code
changes are out of scope.

Next: host-native implementation plan, then stop before Build.
