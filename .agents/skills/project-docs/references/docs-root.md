# Doc root resolution

Project docs default to `$ROOT/docs`. Some repos keep them elsewhere —
another directory, or a **separate documentation repo cloned outside this
one**. Every skill that reads or writes project docs resolves the root
the same way instead of hardcoding `docs/`.

## Precedence

Last one that is set wins:

| Source                          | Scope                        | Committed | Use for                                                  |
|---------------------------------|------------------------------|-----------|----------------------------------------------------------|
| `$ROOT/docs`                    | this repo                    | —         | default                                                  |
| `$ROOT/.agents/docs-root`       | this repo, shared            | yes       | relative path the whole team can use (`../product-docs`) |
| `$ROOT/.agents/docs-root.local` | this repo, one machine       | no        | absolute path when checkout layouts differ per developer |
| `AI_DOCS_ROOT` env var          | **every** repo in that shell | no        | one-off runs and CI only                                 |

Both files are per-project and survive a reboot; they are read fresh on
every run, so nothing has to be re-set after a restart.

Commit `.agents/docs-root` only with a **relative** path — an absolute
path is machine-local and breaks for everyone else on the team. Use
`.agents/docs-root.local` (gitignored) for a machine-local absolute path.

`AI_DOCS_ROOT` is a last resort: an exported variable applies to **every**
project run from that shell and is lost on restart, so it silently points
other repos at the wrong docs. Prefer a file.

## Resolution snippet

Paste into the preamble after `ROOT` is set:

```bash
DOCS="$ROOT/docs"
for f in .agents/docs-root .agents/docs-root.local; do
  [ -f "$ROOT/$f" ] && DOCS=$(tr -d '\r' < "$ROOT/$f" | sed -n '1p')
done
[ -n "$AI_DOCS_ROOT" ] && DOCS="$AI_DOCS_ROOT"
case "$DOCS" in /*|[A-Za-z]:/*|[A-Za-z]:\\*) ;; *) DOCS="$ROOT/$DOCS" ;; esac
[ -d "$DOCS" ] && DOCS=$(CDPATH= cd -- "$DOCS" && pwd)
case "$DOCS" in "$ROOT"/*) DOCS_EXTERNAL=no ;; *) DOCS_EXTERNAL=yes ;; esac
case "$DOCS" in *"/../"*|*"/..") DOCS_EXTERNAL=yes ;; esac
echo "DOCS: $DOCS (external: $DOCS_EXTERNAL)"
[ -d "$DOCS" ] || echo "DOCS: directory not found — continue without project docs"
```

Three details are load-bearing:

- `tr -d '\r'` — the file is often edited on Windows; a trailing `\r`
  silently corrupts the path.
- `[A-Za-z]:/*|[A-Za-z]:\\*` — keeps a Windows absolute path
  (`C:/path/to/project-docs`) from being appended to `$ROOT`. Write the
  two forms as separate patterns: a bracket expression containing a
  backslash (`[/\\]`) does not close, and the whole test silently fails.
- `cd -- "$DOCS" && pwd` — normalizes `..` away. Without it
  `$ROOT/../product-docs` still *starts with* `$ROOT`, so a sibling docs
  repo is misread as in-repo and becomes eligible for commit. A root that
  does not exist yet cannot be normalized, so a leftover `..` counts as
  external — the safe direction.

## Rules

1. **Never block on a missing doc root.** A teammate may not have cloned
   the docs repo. Report the miss and continue — same rule as missing
   `docs/PRD.md`. Do **not** `mkdir` a configured root that does not
   exist: an absent `../product-docs` means the docs repo is not cloned,
   and creating it produces a decoy. Only the default `$ROOT/docs` may be
   created on demand.
2. **Never auto-commit an external doc root.** When `DOCS_EXTERNAL=yes`,
   writes land in a different git repo that `ship` does not see. Write
   the file, show the path, and tell the user to commit it in that repo.
   Do not `git add`, commit, or push there, and do not pull it into this
   repo's PR.
3. **One doc root per repo.** Do not mix — if `AGENTS.md` points at a
   sibling docs repo, do not also create `docs/` here.
4. **`.agents/planning/` stays local** regardless of the doc root. Plans
   are per-dev, per-branch, disposable; they never move to a docs repo.
