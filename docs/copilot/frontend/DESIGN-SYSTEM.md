# Athlify design system

The brand book for the "Night Ride" theme. It turns the decisions in
[ADR-005](adr/ADR-005-theme-tokens.md), the [persona](../personas.md) and the
existing UI into usage rules that name tokens. Build agents and
`plan-design-review` load it before UI work.

**Values live in code, not here.** Token names below are the Chakra names
from `src/frontend/athlify/src/theme/`. Look up values there:
`palette.ts` (raw values), `semantic.ts` (meaning, light `base` and dark
`_dark`), `index.ts` (gradients, fonts, radii, text styles). When the theme
changes, update this file only if a rule or a token name changes.

The light mode is *Day* and the dark mode is *Night Ride*. The default mode
follows the operating system. Every rule below holds in both modes.

## Principles

- **Data first, calm and personal.** Open every view with a few large,
  self-explaining totals, then let details unfold on demand. No feed
  patterns, kudos, marketing or decoration that competes with the numbers.
- **Missing data is not zero.** Show "—" and say why. Never render `0` for
  a value that wasn't measured.
- **Meaning lives in tokens.** Views use semantic tokens (`bg*`, `fg*`,
  `border`, `brand.*`, `spark.*`, `chart.*`) and never hex values, raw
  scale steps (`brand.400`) or Chakra's built-in palettes (`teal.*`,
  `blue.*`).
- **Two moments.** On the phone, answer "what did my last ride add?" at a
  glance. On the laptop, compare periods and bicycles side by side.

## Content and voice

- The UI is bilingual, German first and English (i18next, ADR-003). Swiss
  German spelling: "schliessen", "grösser", never "ß". Bicycles are
  "Velos".
- Address the rider with informal *du*: "Hier erfasst du bald deine Velos
  und Gadgets."
- Use sentence case for titles and buttons: "Seite nicht gefunden",
  "Erneut versuchen". Domain nouns keep their product spelling:
  "Body-Stats", "Events", "Garage", "Dashboard" (see the
  [glossary](../../GLOSSARY.md)).
- Keep it short and concrete. Errors say what failed and offer a way out:
  "Die Daten konnten nicht geladen werden." + **Erneut versuchen**.
  Loading text ends in a spaced ellipsis: "Wird geladen …".
- Period labels come in pairs. Short labels go on toggles ("30 T", "90 T",
  "1 J", "Alle"); long labels go in accessible names and notes ("Letzte 30
  Tage", "in 30 Tagen").
- No emoji in text. The one exception is a value scale where the emoji
  carries the value (mood, wind and the effort group of an activity —
  1–3 😌, 4–6 😅, 7–8 🥵, 9–10 🔥, shown before the number in the table and
  above the slider thumb in the form): in the form each emoji
  sits above its text label; in a table cell the emoji stands alone with
  the label as `aria-label` and `title`; filters and filter chips use the
  text only. Number
  formats follow the locale (`useFormat`); use a real
  minus sign in deltas ("−0.7 kg").

## Colour

| Token | Use for |
|---|---|
| `bg` | Page canvas. Dark mode adds the `headlight` glow, top-left. |
| `bg.panel` | Panels, KPI tiles, the sticky header (`bg.panel/80` with an 8px backdrop blur). |
| `bg.subtle`, `bg.muted` | Quiet fills and hover states (drawer item hover is `bg.muted`). |
| `fg` | Body text and headings. |
| `fg.muted` | Descriptions, units, KPI notes, kicker labels in tiles, inactive navigation. |
| `border` | Decorative hairlines (≈1.3:1). Never the only cue that separates or selects a control. |
| `brand.solid` + `brand.contrast` | Primary actions, spinner, selected tile outline. Dark mode puts navy text on cyan, never white. |
| `brand.fg` | Active nav item, kickers, links, empty-state icon. |
| `brand.subtle` | Selected states: selected KPI tile, active drawer item, active period toggle, empty-state icon chip. |
| `brand.emphasized` | Hover outline of an unselected KPI tile. |
| `brand.focusRing` | Focus rings, drawn outside the element (`focusVisibleRing="outside"`). |
| `spark.fg`, `spark.solid` | Effort and power data only (TSS, watts). |
| `chart.primary`, `chart.secondary`, `chart.effort`, `chart.form` | Chart series, in that order. |

- **Blue means the app and interaction.** The App Layout sets
  `colorPalette="brand"`. Portal content (dialogs, toasts) sits outside it,
  so set `colorPalette="brand"` on `Dialog.Content`, as `FormDialog` does.
- **Brand cyan (`brand.300`–`brand.500`) is never text in light mode.** It
  fails contrast on light surfaces.
- **Orange (`spark`) is never used for buttons, links, navigation, errors
  or warnings.** Errors and destructive actions use Chakra's `red` palette
  (for example the confirm-delete button). In light mode `spark.fg` reaches
  only 4.3:1 on `bg.muted`, so keep it on `bg`, `bg.panel` or `bg.subtle`.
- **Charts.** `chart.secondary` and `chart.form` never appear in the same
  chart. Never tell series apart by colour alone: add labels, markers or
  line styles.
- **Contrast floors.** Text needs 4.5:1 and graphics, focus rings and
  meaningful icons need 3:1 in both modes. `src/tests/theme/contrast.test.ts`
  enforces this for the theme. New colour pairs in views must meet it too.

## Gradients

- `volt` is the full logo gradient (cyan → middle blue → cobalt). Use it
  **only for the brand mark**. `voltAcross` is its horizontal version.
- The **indicator** bar marks "this one is active". It uses the half of the
  gradient that stays visible on each surface: `indicator` (middle → cobalt
  in light mode, cyan → middle in dark mode). It is `1` (0.25rem) thick and
  skewed by −20°, the logo's lean. It sits on the bottom edge of the active
  header nav item and of the selected KPI tile. In the mobile drawer it runs
  vertically along the left edge without skew (`indicatorDown`).
- Use at most **one gradient element per visible area**.
- Reference gradient tokens without the category prefix:
  `bgImage: 'indicator'`, not `'gradients.indicator'`.

## Type

- Headings and big numbers use **Barlow Semi Condensed 600** (`heading`);
  everything else uses **Inter Variable** (`body`). Both fonts are
  self-hosted through `theme/fonts.ts`; never add a font CDN.
- **Page title:** the page `h1` in `Page`, 2rem below md and 2.5rem from md,
  line height 1.1. An optional description follows in `fg.muted`, capped at
  `65ch`.
- **`textStyle="kpi"`:** totals in italic Barlow with tabular numerals and
  line height 1 (2rem below sm, 2.5rem from sm; 1.5rem/2rem inside a
  KPI tile). Always pair it with a unit in `fg.muted`, a `kicker` label and
  a comparison period ("in 30 Tagen").
- **`textStyle="kicker"`:** 0.75rem, semibold, uppercase, 0.08em tracking.
  It is `brand.fg` by default and `fg.muted` inside tiles.
- **Wordmark:** "Athlify" beside the mark is bold, 1.125rem, −0.02em.
- Buttons are semibold (button recipe). Body copy is 1rem/1.5rem; notes,
  deltas and table cells are 0.875rem.

## Spacing and layout

Follow [`css-conventions`](../../../.agents/skills/css-conventions/SKILL.md).
In short:

- Spacing follows an **8px rhythm written in rem**: `2` (0.5rem), `4`
  (1rem), `6`, `8`, `10`, `16`. Use `1` (0.25rem) for fine gaps such as icon
  to label or value to unit. 0.125rem is the floor. Never use arbitrary
  values like 13px.
- **Grid first** for page structure, card grids and forms. Use Flexbox only
  for one-dimensional inline rows (icon + label, button groups).
- **Gap, not margin.** The parent owns sibling spacing.
- **Shell:** a sticky header (`h="16"`, bottom `border`) and main content in
  a `Container maxW="7xl"`. Content padding is `6` vertically on mobile and
  `10` from md. Page sections stack at `gap="8"`.
- Below md, the primary nav collapses into a drawer with `h="12"` rows. Nav
  icons show from lg in the header row and always in the drawer.

## Shape, depth and motion

- Radii: `l2` (0.5rem) for buttons, inputs and drawer items; `l3` (0.75rem)
  for KPI tiles, panels, empty states and icon chips; `l1` (0.125rem) for
  tight corners. Corners stay small and precise.
- Depth comes from surface steps and hairline borders, not shadows.
- Transitions are 150ms on colour, border and opacity only, eased out.
  Every transition turns off under `prefers-reduced-motion`
  (`_motionReduce`).

## States and accessibility

- Every view has four states, provided by `Page`: **ready**, **loading**
  (centred spinner in `colorPalette.solid` with a hidden "Wird geladen …"),
  **empty** (dashed `l3` box with an icon chip in `brand.subtle`/`brand.fg`
  and the page's primary action repeated) and **error** (an alert with
  **Erneut versuchen**).
- Selected toggles and tiles set `aria-pressed`. Destructive confirms
  (`ConfirmDialog`) give initial focus to **Abbrechen**, so Enter never
  deletes by accident.
- Every page offers the skip link "Zum Inhalt springen". Dialogs open from
  the bottom on mobile and in the centre from sm.

## Row actions and forms

- **Row actions.** Editing is the row itself: a click, or Enter on the
  focused row, opens the form, and `DataTable`'s `rowLabel` names the row
  by that action ("Aktivität vom 16. Okt. 2026 bearbeiten"). There is no
  separate edit button. The remaining actions are ghost `sm` icon buttons
  in `fg.muted` with an `aria-label` that names the row: a single delete
  button (Body-Stats), or a "⋯" `Menu` (`LuEllipsis`) when there are
  several (Activities). A destructive item comes last in the menu, after a
  separator, in `fg.error` with a `bg.error` highlight. Menu items act on
  `onClick`, which Enter on a highlighted item triggers as well.
- **Forms.** `*` means "calculated or system value" (user story US-03), so a
  form that shows such values does not show Chakra's required indicator;
  required fields set `required` (so `aria-required` is set) and explain
  themselves through the error text. Calculated and system values sit in a
  read-only block below the fields, headed by a `kicker` "Berechnet", marked
  with `*` and explained by the note "* Wird automatisch berechnet."; a
  missing value shows "—".
- Fields that most records leave empty are folded under "Weitere Details"
  (closed for new records, open when editing a record that has values there;
  an error inside opens it). Pairs of short number fields stay side by side
  on phones. Optional selects start at "—", never at a pre-chosen value.
- Durations are entered as `h:mm` (`.` works too), with `1:30` as the
  placeholder; the format is named only in the error text, so no helper
  line pushes the field out of its row. The form shows no seconds; when an
  edited record's minutes stay the same, its stored seconds are kept.
- Number fields carry their unit as an addon beside the input. A group of
  fields with the same unit (heart rate min/Ø/max) names it once in the
  legend ("Herzfrequenz (bpm)") instead, so three fields fit side by side
  on phones.
- While "Weitere Details" is folded, its trigger shows how many of the
  fields inside hold a value ("· 3 Angaben").
- A rating on a short numeric scale (effort 1–10) is a Chakra `Slider`
  whose far left, 0, means "Keine Angabe". A few ordered values (mood,
  wind) are a row of toggle buttons with an emoji above the label; the
  chosen one is `brand` `subtle` with a `brand.solid` border, and pressing
  it again clears the value. Gadgets and tags are chips switched on and
  off (tags in their table colour, `tagColorPalette`; gadgets in `brand`).
  Without options, a muted line says so ("Noch keine Gadgets erfasst.").
  The last tag chip is a small dashed "+ Neuer Tag" button that opens a
  popover with the name, "Abbrechen" and "Erstellen" (Enter creates); it
  is not portalled, so it stays in the dialog's focus trap. An existing
  name is ticked instead of created twice.
- `FormDialog` scrolls its body inside the dialog; the footer with
  "Speichern" and "Abbrechen" always stays visible.

## Components to reuse

Before designing something new, check whether one of these already covers it
(`src/components/`, `src/layouts/`):

| Component | What it is |
|---|---|
| `Page` | Page frame: title, description, actions and the four states. |
| `KpiTile` | Selectable total with kicker, `kpi` value, unit, delta arrow and note; selected = `brand.subtle` + indicator bar. |
| `MetricChart` | One Recharts series over time, coloured through theme CSS variables. |
| `PeriodPicker` | Attached toggle group for 30 T / 90 T / 1 J / Alle. |
| `DataTable` | Every list table, sorted by the server (controlled `sort`; a first click sorts descending). It also renders the count above the rows (`count`, 0.875rem `fg.muted`) and "load more" with its inline error (`pagination`), so tables never build these themselves; `DataTableSkeleton` is their loading state. The header spans the full width: every header cell, the row-actions column included, is sticky on `bg`, so rows never show through it while scrolling. A column with a `description` explains itself in a tooltip (see below). A column can declare a `filter`: its trigger shows the ticked count (`brand.subtle` badge with `brand.fg`) and opens a `FilterPopover`. |
| `Checklist` | Multi-select as a group of checkboxes (`fg.muted` outline, `brand.solid` when ticked), an optional search for long lists, "N ausgewählt" and "Auswahl löschen". In a filter it lives in the `FilterPopover` (popover from `sm`, bottom sheet below), which ends with "Fertig"; forms use chips instead (see "Row actions and forms"). |
| `Tooltip` (`components/ui/tooltip`) | Explains an abbreviated or technical term, never more. In tables a column sets `description`: the header label gets a dotted `fg.muted` underline and the text appears on hover and keyboard focus after 300 ms, on `bg.panel` with a hairline `border`, `l2`, 0.875rem, at most `20rem` wide. Only where a term needs it (TSS, Ø, units, estimated values); self-explaining headers such as Datum, Distanz or Gewicht get none. It is never the only place for data and never shows truncated text. Touch has no hover, so essential information must also be visible elsewhere. |
| `FormDialog`, `ConfirmDialog` | Add/edit dialog (`size="lg"` for long forms) and destructive confirmation. `ConfirmDialog` takes `finalFocusEl` when the element that opened it disappears with the delete. |
| Chakra `Menu` | The "⋯" row menu (see row actions below). `Menu.Content` sets `colorPalette="brand"`, because it renders in a portal. |
| Chakra `Collapsible` | Folds rarely used form fields under "Weitere Details". |
| `PrimaryNav`, `MobileNav`, `UserMenu`, `AppHeader` | Shell navigation with the indicator bar. |
| `BrandMark` | The logo mark with the `volt` gradient. |

## Iconography and brand mark

- Icons come from **Lucide** via `react-icons/lu` (for example `LuArrowUp`,
  `LuArrowDown`, `LuMinus` for deltas, `LuInbox` for empty states). They
  are line icons that inherit `currentColor`, sized to the adjacent text.
  Decorative icons get `aria-hidden`.
- The only brand graphic is the mark (`public/favicon.svg`, rendered by
  `BrandMark`): an "A" with a lightning-bolt counter in the `volt`
  gradient, at `boxSize="7"` beside the wordmark with `gap="2"`. Never
  recolour it, flatten it or reuse `volt` elsewhere.
- No emoji (except the value scales above), illustrations or stock imagery.

## Not this

Purple or blue-purple gradients, emoji as decoration, identical card grids,
centred-everything layouts, cards with a coloured left border, shadows for
depth, orange buttons, `0` for missing data, and vague microcopy.
