# ADR-002: Chakra UI v3 as the frontend component system

**Date**: 2026-09-23
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The frontend needs consistent, accessible building blocks for navigation,
forms, tables, dialogs, feedback, charts and light/dark themes. Tailwind CSS
v4 was set up first as the styling framework. Chakra UI v3 was then added
(`@chakra-ui/react`, `@emotion/react`, `next-themes`), together with
`@chakra-ui/charts` on top of Recharts. The language switcher and color-mode
toggle already use Chakra components. A component system shapes every view,
so switching later means rewriting most UI code.

## Options Considered

### Option 1: Tailwind CSS only, with hand-built components

- Pros: Small runtime, full visual control.
- Cons: Accessible dialogs, selects, toasts and tooltips must be built or
  sourced separately; more work for a two-person team.

### Option 2: Chakra UI v3 (with Chakra Charts on Recharts)

- Pros: Accessible components, theming and color mode out of the box;
  chart styling follows Chakra theme tokens.
- Cons: Emotion runtime styling; larger bundle; Chakra CLI snippets need
  lint exceptions (see [frontend learnings](../LEARNINGS.md)).

### Option 3: Another component library (for example MUI or Mantine)

- Pros: Comparable component coverage.
- Cons: Not yet explored in this repository.

## Decision

**Chosen**: Option 2 — Chakra UI v3

Chakra covers the accessibility, theming and feedback requirements from the
[frontend SAD](../SAD.md) with little custom code, which fits the project's
scope.

## Consequences

### Positive

- Light/dark mode is provided through `src/components/ui/provider.tsx` and
  `color-mode.tsx`.
- Charts can use Chakra theme colors through `useChart`.

### Negative / Trade-offs

- Tailwind CSS v4 is still loaded through `src/index.css`. Whether Tailwind
  stays next to Chakra is **open**. Keeping both means two styling systems
  and two CSS resets.
- Three prototype chart variants (plain Recharts, Chakra Charts, hybrid)
  still exist. The chart approach for product views is **open**.

## Implementation Notes

- Wrap the app in the Chakra `Provider` from `src/components/ui/provider.tsx`.
- Generated Chakra snippets live under `src/components/ui/`.
- Use Chakra components for new UI unless a later ADR decides otherwise.
