---
name: plan-ceo-review
description: >
  Strategy review that rethinks the problem and finds the 10-star product
  hiding inside the request. Challenges scope with four modes (Expansion,
  Selective Expansion, Hold Scope, Reduction). Use when the user says
  "CEO review", "review the plan", "is this the right thing to build", or
  "challenge the scope". First step of the plan chain; runs before
  plan-eng-review. A ticket, PRD, or the user's description is brief enough.
---

# CEO / strategy review

Plan stage (strategy). Pressure-test _what_ is being built before _how_.
Are we building the 10-star thing, or a safe, forgettable version of a
real request?

Project work usually starts from an existing request, ticket, or product
brief. Do not run a discovery interview ("who feels this pain today?")
unless the user is genuinely undecided whether to build it at all.

## Planning-only guardrail

Do not implement. Do not edit source files or commit. Writing
`.agents/planning/<branch>/01-ceo-review.md` is in scope. After writing
it, the next step is `plan-eng-review` — stop until the user asks for
that or for Build.

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
[ -f "$DOCS/PRD.md" ] && echo "--- PRD.md ---" && cat "$DOCS/PRD.md"
[ -f "$DOCS/personas.md" ] && echo "--- personas.md ---" && cat "$DOCS/personas.md"
```

`DOCS` is the project's doc root — `docs/` by default, elsewhere (even a
separate repo) when the project says so. See
[`project-docs/references/docs-root.md`](../project-docs/references/docs-root.md).

If neither file exists, the user's message _is_ the brief. Do not block,
and do not invent a prior discovery session.

## Method

Declare a **scope mode**:

- **Expansion** — the request is too small; there is a 10-star product
  here. Argue for concrete added capabilities and their cost as
  "N human / M AI-assisted".
- **Selective Expansion** — most scope is right; add the 1–2 things that
  turn it from useful to delightful.
- **Hold Scope** — the scope is correct; defend it against creep.
- **Reduction** — the request is an ocean or premature; cut to the wedge.

Then work through these lenses:

1. **The real problem.** Restate it in one sentence. Is the plan solving
   that, or a proxy for it?
2. **10-star test.** What would the absurdly great version look like?
   Which parts of it are now cheap because of AI?
3. **The wedge.** What ships first, and does it stand alone as valuable?
4. **Differentiation.** Why this, why now, why us? What's the non-obvious
   edge? For project work, "us" is the team and this repository, not a
   hypothetical consumer startup.
5. **Risk & reversibility.** Most expensive wrong assumption? Which
   decisions are one-way doors?
6. **Sequencing.** Order that maximizes learning per unit of effort.

At genuine forks: one question at a time, recommended option first. Never
decide product direction unilaterally.

If `$DOCS/personas.md` exists, check the plan against those personas. If
it does not, do not block.

## Output

Write `$PLAN/01-ceo-review.md`: chosen mode, restated problem, the
10-star vision, the wedge, decisions made, open questions.

If a prior plan or PRD exists, update it in place so it matches the
decisions — do not leave two conflicting briefs.

Tell the user the next step is `plan-eng-review`.
