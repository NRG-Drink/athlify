# Glossary maintenance loop

Read this when you are actively reshaping the domain model, not just
reading it.

## The loop

Run continuously while terminology is in play:

1. **Hear a term.** The user (or the code) names a concept.
2. **Locate it.** Is it already in `docs/glossary.md`? Grep for it and any
   synonyms.
3. **Reconcile.**
   - **Already defined, used consistently** → nothing to do.
   - **Already defined, used differently** → challenge it; let the user
     pick; update the glossary so the resolved meaning wins.
   - **Not defined, but load-bearing** → propose a canonical term and a
     one-line definition. Add it once the user agrees.
   - **Fuzzy / overloaded** → split it. Two concepts under one word each
     get their own entry.
4. **Cross-reference code.** If the user asserts behavior, confirm the
   code agrees. A contradiction is a finding — surface it before writing.
5. **Write inline.** Update `docs/glossary.md` immediately, in the right
   alphabetical section, with cross-links to the ADR / feature that owns
   the concept.

## What belongs in the glossary

- **In**: the term, a plain-English definition, tags where relevant, and
  links to the ADR / feature that govern it.
- **Out**: implementation details, file paths, code snippets, schemas, API
  shapes. Those live in the SAD, ADRs, or the code. A glossary entry that
  mentions a table name has drifted — trim it.

## Worked examples

**Challenge against the glossary**

> User: "When a member cancels their timesheet…"
> You: "The glossary defines **Cancellation** as voiding an _issued
> invoice_. For a timesheet you probably mean **Withdraw**. Should I add
> **Withdraw** as a distinct term?"

**Sharpen fuzzy language**

> User: "The account owner gets the email."
> You: "‘Account’ is overloaded — the glossary has **Team** (the tenant)
> and **User** (a person). Confirm and I'll pin that down."

**Cross-reference with code**

> User: "Invoices are editable until they're paid."
> You: "The code marks an invoice immutable at _issuance_, not at payment
> (see the glossary and ADR-014). Which is correct?"

## Multi-context repos

When `docs/CONTEXT-MAP.md` exists, resolve a term **in its context first**.
The same word can mean different things in `billing` vs `time-tracking` —
that is expected. Only escalate to a shared term when the contexts
genuinely share the concept.
