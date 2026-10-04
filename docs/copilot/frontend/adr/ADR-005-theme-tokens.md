# ADR-005: "Night Ride" theme as Chakra semantic tokens

**Date**: 2026-09-26
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The App Layout ran on Chakra's `defaultSystem` with a `teal` placeholder
palette, and the mockup's lavender accent clashes with the Athlify favicon
(a cyan-to-cobalt gradient). Every view built from now on copies whatever
colors the shell uses. Color also has to carry meaning for the persona
[Luca](../../personas.md), who wants totals that stand out without
decoration, and it has to work in light and dark mode because the default
color mode follows the operating system. Token names are referenced by
every view, so renaming them later is expensive.

## Options Considered

### Option 1: Chakra defaults with a built-in palette (`teal`/`blue`)

- Pros: No theme code, and Chakra's contrast in both modes is proven.
- Cons: The palettes don't match the logo, and there's no place to give
  colors a domain meaning (effort, chart series).

### Option 2: A Tailwind theme

- Pros: Tailwind is still loaded.
- Cons: The layout and ADR-002 use Chakra. Chakra components wouldn't see
  Tailwind tokens, so there would be two color systems.

### Option 3: Plain CSS variables without Chakra tokens

- Pros: Framework-independent.
- Cons: Chakra's `colorPalette`, `_dark` conditions and recipes wouldn't
  use them; every component would need manual wiring.

### Option 4: A custom Chakra system with semantic tokens

- Pros: `colorPalette="brand"` switches the whole layout; light and dark
  values sit next to each other; the mapping is pure data and can be
  unit-tested for contrast.
- Cons: Couples the theme to Chakra (already accepted in ADR-002).

## Decision

**Chosen**: Option 4, a custom Chakra system in `src/theme/`.

The brand scale is derived from the favicon gradient, and a separate orange
`spark` color is reserved for effort data. Views address colors only
through semantic names. That keeps the meaning of each color in one file,
and lets tests enforce the contrast rules in both modes.

## Consequences

### Positive

- The whole layout changes palette through one `colorPalette` prop.
- Contrast rules are automated (`src/tests/theme/contrast.test.ts`).
- Charts, buttons and navigation share one color language.

### Negative / Trade-offs

- The token names below are a contract; renaming them touches every view.
- Chakra-internal components that use `gray.*` keep Chakra's neutral
  grays. A navy-tinted `gray` override is a possible follow-up.
- Tailwind classes don't know these tokens; Tailwind must not be used for
  colors.

## Implementation Notes

- `src/theme/palette.ts` holds raw values, `src/theme/semantic.ts` holds the
  meaning (`{ base, _dark }` pairs), and `src/theme/index.ts` builds
  `system`. `src/components/ui/provider.tsx` passes that `system` to
  Chakra.
- The token names form a contract:
  - `bg`, `bg.panel`, `bg.subtle`, `bg.muted`, `fg`, `fg.muted`, `border`;
  - the `brand` palette (`solid`, `contrast`, `fg`, `subtle`, `muted`,
    `emphasized`, `focusRing`) and `spark.{fg,solid}`;
  - `chart.{primary,secondary,effort,form}`;
  - the gradients `volt`, `voltAcross`, `indicator`, `indicatorDown` and
    `headlight` (the dark-mode canvas glow);
  - the text styles `kicker` and `kpi`.
- Views never use hex values or Chakra's built-in palettes (`teal.*`,
  `blue.*`) for meaning.
- Blue (brand) means the app and interaction. Orange (`spark`) is only for
  effort and power data, and never for buttons, links, navigation, errors
  or warnings.
- Brand cyan (`brand.300`–`500`) is never text in light mode. Text reaches
  at least 4.5:1 and graphics at least 3:1 in both modes; the contrast
  tests enforce this.
- The full logo gradient `volt` is used only for the brand mark. The nav
  indicator uses the half of it that stays visible on each surface:
  `indicator` runs from the middle stop to cobalt in light mode, and from
  cyan to the middle stop in dark mode. Use at most one gradient element
  per visible area.
- In a chart, `chart.secondary` and `chart.form` never appear together.
  Series are never told apart by color alone.
- KPI values use `textStyle="kpi"` with a unit, a label and a comparison
  period. Missing data shows "—" and never `0`.
