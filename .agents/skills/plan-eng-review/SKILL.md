---
name: plan-eng-review
description: >
  Eng-manager review that locks architecture before code — data flow, state,
  interfaces, edge cases, assumptions, test matrix, branch prescription.
  Use when the user says "eng review", "review the architecture", "plan the
  implementation", or "what could go wrong".
---

# Engineering review

Plan stage. Invoke once _what_ to build is settled and you need to lock
_how_. Turns a product plan into an implementation plan an agent can
execute without guessing.

## Planning-only guardrail

Do not implement. Do not edit source files, create production code, run
mutating app commands, create branches or worktrees, or commit. Writing
`.agents/planning/<branch>/02-eng-review.md` is in scope. Prescribing a
**Branch / workspace** for Build is required; executing it is not.

After writing the artifact, hand off to the host's native Plan mode
(Cursor Plan Mode, Claude Code `/plan`). Stop until the user starts Build.

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
```

Then **read the actual code** the change touches. Do not plan against an
imagined codebase.

Read `$DOCS/glossary.md` if present so names match the project's language.
Load `$DOCS/PRD.md`, `$DOCS/SAD.md`, and `$DOCS/adr/` when they exist —
`DOCS` is the project's doc root, not always `docs/` (see
[`project-docs/references/docs-root.md`](../project-docs/references/docs-root.md)).
Use the `codebase-design` vocabulary when describing
architecture: **module**, **interface**, **depth**, **seam**, **adapter**,
**leverage**, **locality**.

## Method

1. **Architecture.** Where does this live? Modules, boundaries, contracts.
   Data flow as ASCII or mermaid.
2. **State & lifecycle.** Source of truth vs derived.
3. **Interfaces.** Function/API signatures and types before logic.
4. **Edge cases & failure modes.** Empty/null, concurrency, partial failure,
   retries, timeouts, large inputs, permissions. Intended behavior for each.
5. **Hidden assumptions.** Flag the ones that, if wrong, sink the plan. At
   genuine forks: one question at a time, recommended option first.
6. **Test matrix.** For each behavior, the test that proves it and the
   observable it asserts on — return value, thrown error, accessible
   role/state, visible text, effect at a boundary. A row whose only
   observable is a class name or markup is not a test; route appearance
   to a real browser. Note unit vs integration vs e2e/QA.
7. **Branch / workspace.** Prescribe how Build starts — do not create it.
   Default: a new feature branch off the repo default. Stay on the current
   branch only if already on a feature branch or a hotfix is in flight.
   Escalate to a git worktree when isolation is warranted (parallel work,
   risky experiment).
8. **Rollout & reversibility.** Migration, flag, rollback.

## Output

Write `$PLAN/02-eng-review.md`: architecture diagram, state model,
interfaces, edge-case table, assumptions (flagged), test matrix,
**Branch / workspace**, rollout. Source-code changes are out of scope.
The test matrix is the contract `code-review` and `ship` verify against.

Required section:

```markdown
## Branch / workspace

- Branch: `feature/<name>` (from `<base>`)
- Workspace: current tree | worktree
- Notes: <dirty tree, already on feature branch, etc.>
```

Durable decisions: append one dated line to `$DOCS/LEARNINGS.md`, never a
machine-local session directory.

Next: host-native implementation plan, then stop before Build.
