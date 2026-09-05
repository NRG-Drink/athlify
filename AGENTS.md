# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository.
See README.md for full end-user/operator documentation — this file focuses
on what an agent needs to know to make correct, safe changes quickly.

## Documentation / README

When asked to update README.md, follow the section structure/style of the
Sumonta056/Readme-Template
(title + badges → Overview & Features → Tech Stack & Sources → Getting
Started & Installation → Usage → Contributing → Issues → License), adapted
for this project (it's a private GitHub-hosted repo with no OSS license —
don't add fake GitHub/MIT boilerplate; the "Contributing"/"Issues"/"License"
sections should reflect the real GitHub workflow and proprietary
status). Keep the Table of Contents in sync with the actual headings, and
keep the README itself short — move in-depth explanations (e.g. full config
precedence rules, detailed branching workflow) into docs/ rather than
inlining them.

Longer-form docs (e.g. contribution guidelines, configuration reference)
belong under docs/ — every file added there must be linked from
README.md (Table of Contents plus the relevant section) so it isn't
orphaned. See docs/CONTRIBUTING.md and docs/CONFIGURATION.md for the
current examples.

For frontend work, read `docs/frontend/copilot/README.md`, and for backend
work read `docs/backend/copilot/README.md`. When a frontend or backend
change introduces, renames or changes the meaning of a user-facing term,
domain concept, UI state, filter, route, API, data-model, integration or
security term, update `docs/GLOSSARY.md` in the same change. Do not change
the glossary for implementation-only changes without new terminology.

Language conventions are fixed across the project: the application UI is
implemented bilingually in German and English. Project documentation under
`docs/` is English-only. Source code, code comments, identifiers, API names,
database names and technical implementation terms are written in English,
unless an external contract requires another spelling. Do not translate code
identifiers into German.

At the end of every task, actively check whether a durable, verified
repository learning was discovered. If so, update the matching
`docs/frontend/copilot/LEARNINGS.md` or
`docs/backend/copilot/LEARNINGS.md` in the same change without waiting for
the user to request it. Frontend learnings belong in the frontend file,
backend learnings in the backend file, and cross-cutting learnings may be
recorded in both when each context needs the information. Record the
specific rule, why it matters, and the relevant file or command. Do not
record temporary task state, obvious information, guesses, secrets or
personal data. If no durable learning was discovered, leave the files
unchanged.

## Documentation synchronization

Before finishing every task, classify the change as functional, frontend,
backend, technical, documentation-only or conceptual. For any conceptual
change, inspect the complete `docs/` tree and update every affected document
in the same change. At minimum, check:

- `docs/athlify_concept.md` for the functional source of truth;
- `docs/concept/` for shared architecture, data model, API, security,
  activity-management, technology and testing details;
- `docs/frontend/copilot/` for frontend PRD, SAD and learnings;
- `docs/backend/copilot/` for backend PRD, SAD and learnings;
- `docs/GLOSSARY.md` for changed terminology;
- the relevant ADR index and ADR records for architectural decisions;
- links, indexes, user stories, acceptance criteria and open questions that
  may have become inconsistent.

Do not blindly edit every file in `docs/`. Update all affected files, leave
unaffected files unchanged, and explicitly verify that no stale statement,
duplicate requirement or broken relative link remains. A conceptual change
is not complete until the frontend and backend documentation agree with the
functional concept and with each other.

For every technical change, check whether it introduces an architectural
decision. If it is difficult to reverse, constrains future work and had
meaningful alternatives, create or update the appropriate frontend or
backend ADR without waiting for the user to mention ADRs. Never rewrite an
accepted ADR's decision; supersede it with a new ADR when necessary.

For documentation changes, run `git diff --check` and validate all changed
relative Markdown links before finishing.