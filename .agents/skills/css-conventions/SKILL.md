---
name: css-conventions
user-invocable: false
description: This skill should be used when the user asks to write CSS, style a layout, choose grid vs flexbox, set spacing, or avoid margin for layout — or when reviewing vanilla CSS, Tailwind, CSS Modules, or CSS-in-JS for layout and spacing conventions (grid-first, rem on an 8px scale, gap over margin).
---

# CSS Conventions

## Layout

**Prefer CSS Grid over Flexbox.**

Use Grid as the default for any layout — page structure, card grids, form fields, sidebars, dashboard panels. Grid handles two-dimensional layout natively without wrapper hacks.

Reserve Flexbox only for intrinsically one-dimensional, flow-based alignment where order and wrapping of inline items is the goal (e.g. a row of icon + label, a nav pill group, a tag list).

When in doubt, reach for Grid first.

```css
/* ✅ Grid for layout */
.page {
  display: grid;
  grid-template-columns: 15rem 1fr;
  grid-template-rows: auto 1fr auto;
}

/* ✅ Grid for component structure */
.card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 1rem;
}

/* ✅ Flexbox only for inline flow alignment */
.badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
```

In Tailwind, prefer `grid` + `grid-cols-*` + `gap-*` over `flex` + `gap-*` for anything structural.

## Spacing

**Prefer `rem` over `px`.** Think on an **8px scale** (root `1rem` = `16px`); write the values in `rem`.

- Allowed: `0.5rem`, `1rem`, `1.5rem`, `2rem`, `2.5rem`, `3rem`, `4rem`, `5rem`, `6rem`...
- `0.25rem` (4px) is permitted for fine-grained adjustments (icon padding, tight gaps)
- `0.125rem` (2px) is the floor — never go below it
- Never use arbitrary values like `0.8125rem`, `13px`, `22px`

In Tailwind, even scale steps map to the same rhythm (`space-2` = `0.5rem`, `space-4` = `1rem`, `space-6` = `1.5rem`, etc.). Stick to even Tailwind scale steps.

```css
/* ✅ */
padding: 1rem 1.5rem;
gap: 0.5rem;

/* ❌ */
padding: 13px 18px;
gap: 0.375rem;
```

### Gap over margin

**Space between siblings belongs to the parent — via `gap` — not to the children via margin.**

If a layout needs `margin` / `margin-top` / `margin-bottom` (or Tailwind `m-*` / `mt-*` / `mb-*` / `space-y-*`) to place items relative to each other, the layout is wrong. Put the parent on Grid (or Flex when Flex is justified) and use `gap`.

```css
/* ❌ Margins doing layout work */
.stack > * + * {
  margin-top: 1rem;
}

.card-title {
  margin-bottom: 0.5rem;
}

/* ✅ Parent owns the spacing */
.stack {
  display: grid;
  gap: 1rem;
}

.card {
  display: grid;
  gap: 0.5rem;
}
```

In Tailwind: prefer `grid gap-*` (or `flex gap-*` only where Flex is already correct) over `space-y-*`, `mt-*`, `mb-*` between siblings.

**Allowed uses of margin** (not layout between siblings):

- Centering a block in flow: `margin-inline: auto`
- Optical tweaks that are not structural spacing (rare; prefer padding or gap first)
- Third-party / reset constraints the project does not own

When reviewing CSS, treat sibling margins as a smell: fix the parent's layout instead of adding another margin.
