---
name: ship
description: >
  Release engineer: sync the base branch, run tests, commit, push, and
  open a PR — or provide a paste-ready handoff when the repository forge
  has no CLI. Use when the user says "ship it", "open a PR", "ship this
  branch", or "create the pull request". Manual-only because it has side
  effects.
disable-model-invocation: true
---

# Ship

Ship stage. Turn reviewed work into a pull request. **The invocation is
the confirmation** — do not add an "are you sure" gate. Interrupt only on
a failed precondition or a real ambiguity.

If the repository uses Bitbucket, there is no supported CLI equivalent:
deliver a paste-ready handoff (title, description, create-PR URL).
GitHub/`gh` and GitLab/`glab` remain available when the origin remote uses
those hosts.

Do not invent a fourth delivery path. The three branches in step 7 are
the whole contract.

## Preamble (run first)

```bash
ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "not a git repo"; exit 1; }
BRANCH=$(git branch --show-current 2>/dev/null || echo "")
BASE=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
[ -z "$BASE" ] && for b in main master develop; do
  git show-ref --verify --quiet "refs/heads/$b" && BASE="$b" && break
done
url=$(git remote get-url origin 2>/dev/null || true)
url=$(printf '%s' "$url" | sed 's|^[^:]*://||')
case "$url" in *@*) url=${url##*@} ;; esac
url=$(printf '%s' "$url" | sed 's|:|/|')
url=${url%/}; url=${url%.git}
HOST=$(printf '%s' "${url%%/*}" | tr '[:upper:]' '[:lower:]')
REPO=${url#*/}
case "$HOST" in
  github.com)    FORGE=github;    CLI=gh;   NOUN=pr ;;
  gitlab.com)    FORGE=gitlab;    CLI=glab; NOUN=mr ;;
  bitbucket.org) FORGE=bitbucket; CLI=none; NOUN=pr ;;
  *)             FORGE=unknown;   CLI=none; NOUN=pr ;;
esac
echo "BRANCH: ${BRANCH:-DETACHED}  BASE: ${BASE:-UNKNOWN}"
echo "FORGE: $FORGE  HOST: $HOST  REPO: $REPO  CLI: $CLI"
if [ -d "$ROOT/.changeset" ]; then
  CHANGESET=changesets
  echo "CHANGESET: changesets"
  git --no-pager diff --name-only ${BASE:+"$BASE"...HEAD} -- \
    .changeset ':(exclude).changeset/README.md' ':(exclude).changeset/config.json' \
    2>/dev/null || true
  git --no-pager status -s -- .changeset 2>/dev/null || true
elif [ -d "$ROOT/.semversioner" ]; then
  CHANGESET=semversioner
  echo "CHANGESET: semversioner"
  git --no-pager diff --name-only ${BASE:+"$BASE"...HEAD} -- \
    .semversioner/next-release 2>/dev/null || true
  git --no-pager status -s -- .semversioner/next-release 2>/dev/null || true
else
  CHANGESET=none
  echo "CHANGESET: none"
fi
git --no-pager status -s 2>/dev/null || true
git --no-pager log --oneline "${BASE:+$BASE..HEAD}" 2>/dev/null | head -20
if [ "$CLI" = none ]; then
  echo "DELIVERY: handoff ($FORGE)"
elif ! command -v "$CLI" >/dev/null 2>&1; then
  echo "BLOCKED: $CLI not installed — install it and run: $CLI auth login"
elif ! "$CLI" auth status >/dev/null 2>&1; then
  echo "BLOCKED: $CLI not authenticated — run: $CLI auth login"
else
  echo "DELIVERY: $CLI $NOUN create"
  "$CLI" "$NOUN" view 2>&1 || true
fi
```

## Preconditions

- **Detached HEAD** — report and stop.
- **`BRANCH` equals `BASE`** — ask whether to create a feature branch first.
- **`BASE` unresolved** — ask which branch to target.
- **Nothing ahead of base and nothing uncommitted** — nothing to ship; stop.
- **`BLOCKED:`** — forge CLI missing or unauthenticated. Stop. Report the
  printed fix. Do not invent a fallback.
- **Open PR already exists** — push to it and report the URL.
- **User-facing work, changeset tool present, no fragment** — stop. See
  Method step 4.

## Safety

Never force-push to the base branch, never skip hooks, never amend pushed
commits. Never commit secrets. Stage by name (`git add path`, not `-A`).
Commit messages: imperative mood, no Conventional Commits prefix, subject
50–72 characters, body explains why.

## Method

1. **Sync.** Fetch and rebase/merge the latest base. Resolve conflicts
   deliberately.
2. **Verify.** Run the repo's documented test and build commands (see that
   repo's `AGENTS.md`). If there is no test command, stop and say so — do
   not bootstrap a framework during ship.
3. **Coverage.** Confirm the change is covered (new tests fail without the
   change). Report before/after test count when the runner prints one.
4. **Changelog.** Skip if `CHANGESET` is `none`. Otherwise decide whether
   the work is **user-facing**: a user, operator, or API consumer can
   observe it (UI, public API, CLI, user-visible copy). Tests, CI, internal
   refactors, types-only, and chore are not. If unclear, ask.
   User-facing work needs a **new** fragment on this branch (the preamble
   list, excluding README/config): `.changeset/*.md` or
   `.semversioner/next-release/*`. Missing: stop. Do not invent
   patch/minor/major. Ask whether to add one (repo's documented command)
   or ship without.
5. **Stage & commit** remaining work, if any.
6. **Push** with `-u` if needed.
7. **Deliver.** Pick **exactly one** branch from `$FORGE`.

Title + body on every forge: Summary (why, not just what) + Test plan.

### github — `gh pr create`

```bash
gh pr create --base "$BASE" --title "<title>" --body "$(cat <<'EOF'
<summary>

## Test plan
- <step>
EOF
)"
```

Return the PR URL.

### gitlab — `glab mr create`

```bash
glab mr create --target-branch "$BASE" --title "<title>" --description "$(cat <<'EOF'
<summary>

## Test plan
- <step>
EOF
)" --yes
```

Return the merge request URL.

### bitbucket / unknown — paste-ready handoff

Do not create the PR. Print the URL (Bitbucket only), title, and
description in a fenced block; copy the description body to the clipboard
when `pbcopy` exists.

```bash
enc() { printf '%s' "$1" | sed -e 's/%/%25/g' -e 's/#/%23/g' -e 's/?/%3F/g' -e 's/\&/%26/g' -e 's/ /%20/g'; }
if [ "$FORGE" = bitbucket ]; then
  PR_URL=$(printf 'https://bitbucket.org/%s/pull-requests/new?source=%s&dest=%s\n' \
    "$REPO" "$(enc "$BRANCH")" "$(enc "$BASE")")
  printf 'Open:  %s\n' "$PR_URL"
else
  printf 'Unrecognized host %s — create the pull request manually.\n' "${HOST:-unknown}"
fi
```

If a pre-commit hook modifies files, create a **new** commit (do not
blindly amend).

## Output

The PR/MR URL, or the handoff block, plus a one-line summary. Next is
human merge — this skill does not merge or deploy.
