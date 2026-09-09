---
name: codebase-design
description: >
  Shared vocabulary and principles for designing deep modules. Use when
  designing or improving a module's interface, finding deepening
  opportunities, deciding where a seam goes, making code more testable or
  AI-navigable, or when another skill needs the deep-module vocabulary
  (module, interface, depth, seam, adapter, leverage, locality).
user-invocable: false
---

# Codebase design

Design **deep modules**: a lot of behaviour behind a small interface, placed
at a clean seam, testable through that interface. Use this language wherever
code is being designed or restructured. The aim is leverage for callers,
locality for maintainers, and testability for everyone.

`plan-eng-review` and `code-review` use these terms. Name modules after the
project glossary's terms where it exists (`docs/glossary.md`, or the
declared doc root — [`docs-root.md`](../project-docs/references/docs-root.md)).

## Glossary

Use these terms exactly — don't substitute "component," "service," "API," or
"boundary." Consistent language is the whole point.

**Module** — anything with an interface and an implementation. Deliberately
scale-agnostic: a function, class, package, or tier-spanning slice.
_Avoid_: unit, component, service.

**Interface** — everything a caller must know to use the module correctly:
the type signature, plus invariants, ordering constraints, error modes,
required configuration, and performance characteristics. _Avoid_: API,
signature (too narrow — they refer only to the type-level surface).

**Implementation** — what's inside a module. Distinct from **Adapter**: a
thing can be a small adapter with a large implementation (a Postgres repo)
or a large adapter with a small implementation (an in-memory fake). Reach
for "adapter" when the seam is the topic; "implementation" otherwise.

**Depth** — leverage at the interface: behaviour a caller (or test) can
exercise per unit of interface they have to learn. **Deep** when a large
amount of behaviour sits behind a small interface; **shallow** when the
interface is nearly as complex as the implementation.

**Seam** _(Michael Feathers)_ — a place where you can alter behaviour
without editing in that place; the location at which a module's interface
lives. Where to put the seam is its own design decision. _Avoid_: boundary
(overloaded with DDD's bounded context).

**Adapter** — a concrete thing that satisfies an interface at a seam.
Describes role (what slot it fills), not substance (what's inside).

**Leverage** — what callers get from depth: more capability per unit of
interface they learn. One implementation pays back across N call sites and
M tests.

**Locality** — what maintainers get from depth: change, bugs, knowledge, and
verification concentrate in one place. Fix once, fixed everywhere.

## Deep vs shallow

**Deep module** = small interface + lots of implementation:

```
┌─────────────────────┐
│   Small Interface   │  ← few methods, simple params
├─────────────────────┤
│                     │
│  Deep Implementation│  ← complex logic hidden
│                     │
└─────────────────────┘
```

**Shallow module** = large interface + little implementation (avoid):

```
┌─────────────────────────────────┐
│       Large Interface           │  ← many methods, complex params
├─────────────────────────────────┤
│  Thin Implementation            │  ← just passes through
└─────────────────────────────────┘
```

When designing an interface, ask: can I reduce the number of methods,
simplify the parameters, hide more complexity inside?

## Principles

- **Depth is a property of the interface, not the implementation.** A deep
  module can be internally composed of small, mockable, swappable parts —
  they just aren't part of the interface. Internal seams (private, used by
  its own tests) are distinct from the external seam at its interface.
- **The deletion test.** Imagine deleting the module. If complexity
  vanishes, it was a pass-through. If complexity reappears across N
  callers, it was earning its keep.
- **The interface is the test surface.** Callers and tests cross the same
  seam. If you want to test _past_ the interface, the module is probably
  the wrong shape.
- **One adapter means a hypothetical seam. Two adapters means a real one.**
  Don't introduce a seam unless something actually varies across it.

## Designing for testability

1. **Accept dependencies, don't create them.**

   ```typescript
   function processOrder(order, paymentGateway) {} // testable

   function processOrder(order) {
     const gateway = new StripeGateway() // hard to test
   }
   ```

2. **Return results, don't produce side effects.**

   ```typescript
   function calculateDiscount(cart): Discount {} // testable

   function applyDiscount(cart): void {
     cart.total -= discount // hard to test
   }
   ```

3. **Small surface area.** Fewer methods = fewer tests. Fewer params =
   simpler setup.

## Relationships

- A **Module** has exactly one **Interface**.
- **Depth** is a property of a **Module**, measured against its **Interface**.
- A **Seam** is where a **Module**'s **Interface** lives.
- An **Adapter** sits at a **Seam** and satisfies the **Interface**.
- **Depth** produces **Leverage** for callers and **Locality** for maintainers.

## Rejected framings

- Depth as a ratio of implementation-lines to interface-lines — rewards
  padding. Use depth-as-leverage instead.
- "Interface" as the TypeScript `interface` keyword — too narrow.
- "Boundary" — overloaded with DDD. Say **seam** or **interface**.

## Going deeper

- Deepening a cluster given its dependencies —
  [`references/DEEPENING.md`](references/DEEPENING.md)
- Exploring alternative interfaces —
  [`references/DESIGN-IT-TWICE.md`](references/DESIGN-IT-TWICE.md)
