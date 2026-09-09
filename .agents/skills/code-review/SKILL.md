---
name: code-review
description: >
  Staff-engineer review of the working diff — production bugs that pass CI,
  completeness against the eng-review test matrix, auto-fix the obvious.
  Use when the user says "review my changes", "code review", "review this
  diff", "review the branch", or "is this ready to ship".
---

# Code review

Review stage. After implementing, before ship. Read the diff against the
real codebase, not line-by-line in isolation.

## Preamble (run first)

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "not a git repo"; exit 1; }
BRANCH=$(git branch --show-current 2>/dev/null || echo detached)
SAFE=$(printf '%s' "$BRANCH" | tr '/:' '--' | tr -c 'A-Za-z0-9._-' '-')
PLAN="$ROOT/.agents/planning/$SAFE"
echo "BRANCH: $BRANCH"
echo "PLAN: $PLAN"
git --no-pager diff --stat HEAD 2>/dev/null || true
[ -f "$PLAN/02-eng-review.md" ] && echo "--- 02-eng-review.md ---" && cat "$PLAN/02-eng-review.md"
```

Read the full diff (`git --no-pager diff` and `git --no-pager diff --staged`),
then the surrounding code. If `02-eng-review.md` is missing, review against
the diff and the repo's tests — do not invent a matrix.

## Method

Failure classes that survive CI:

1. **Correctness** — off-by-one, wrong operator, inverted condition, bad default.
2. **Concurrency & ordering** — races, missing awaits, shared mutable state.
3. **Error & edge paths** — unhandled rejection, swallowed error, null/empty,
   partial failure, timeout, retry storms.
4. **Boundaries** — input validation, auth checks, injection, path traversal.
   Flag security findings; do not spawn a whole-project audit from this skill.
5. **Resource safety** — leaks, unbounded growth, N+1 queries.
6. **Completeness** — does it cover the eng-review test matrix, if one exists?
   Are tests present and meaningful (fail without the change)? A test whose
   only assertion is a class name, an inline style, or a serialized component
   tree is a finding — unless the class is the contract (a variant mapped to
   a named token). Appearance belongs in a real browser, not this review.
7. **Clarity** — naming, dead code, drive-by edits. Check names against
   the project glossary (`docs/glossary.md`, or the declared doc root —
   [`docs-root.md`](../project-docs/references/docs-root.md)) when it exists. Assess shape with
   `codebase-design` vocabulary: are new modules **deep** (leverage at the
   interface) or **shallow** (interface nearly matches the implementation)?
   Systemic architectural findings are not bugs; flag them.

Classify each finding:

- **[AUTO-FIXED]** — obvious, safe; fix it with a focused edit and note it.
- **[ASK]** — behavioral or risky; present options and wait before changing.
- **[FLAG]** — out of scope or needs the author's context; report, don't fix.

One question at a time at genuine forks. Recommend an answer.

## Output

A concise report grouped by severity: file:line, class, action taken. End
with a readiness verdict: ship / fix-then-ship / needs-investigation.

If a finding is a durable pitfall, append one dated line to
`LEARNINGS.md` in the project's doc root. Do not write machine-local session paths.
