# When to write an ADR — the gate

`domain-modeling` decides _whether_ a decision earns an ADR. The file format
is owned by `project-docs`
([`adr-template.md`](../../project-docs/references/adr-template.md)).

## The three-part gate

Only offer to create an ADR when **all three** are true:

1. **Hard to reverse** — changing your mind later is costly (data
   migrations, public API contracts, vendor lock-in, security posture).
2. **Surprising without context** — a future reader will wonder why it was
   done _this_ way. The rationale is not self-evident from the code.
3. **The result of a real trade-off** — there were genuine alternatives and
   you picked one for specific reasons.

If any one is missing, **skip the ADR**. A reversible, obvious, or
no-alternative decision does not need a record.

## Framing the offer

When the gate is met, offer it as durable memory, not bureaucracy:

> Want me to record this as an ADR (`Proposed`) so future architecture
> reviews don't re-litigate it?

When the user **rejects a proposal with a load-bearing reason** that a
future explorer would otherwise re-suggest, that rejection itself can earn
an ADR (or a `docs/LEARNINGS.md` line for lighter cases). Skip ephemeral
reasons ("not worth it right now") and self-evident ones.

## Status and supersession

- New ADRs are born `Proposed`. They become binding only when moved to
  `Accepted`.
- **Never edit an `Accepted` ADR's decision.** Write a new ADR that
  supersedes it, and mark the old one `Superseded by ADR-NNN`.
- Respect any per-repo governance in `AGENTS.md`. When a ratification gate
  exists, propose the ADR — do not silently write an `Accepted` one.

## Don't re-litigate

Before proposing, read existing ADRs in the area. If a candidate
contradicts an `Accepted` ADR, only raise it when the friction is real
enough to reopen the decision — and mark it as a challenge to that ADR,
not a fresh choice.
