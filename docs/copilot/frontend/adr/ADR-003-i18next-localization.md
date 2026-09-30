# ADR-003: i18next for the bilingual user interface

**Date**: 2026-09-23
**Status**: Proposed
**Deciders**: Beat Zimmermann, Marco Ebneter (pending team review)

## Context

The user interface must be available in German and English
([`CONCEPT.md`](../../../concept/CONCEPT.md)). Visible text must come from
translation resources instead of being hard-coded in components. Every view
will depend on the chosen translation API, so replacing it later touches all
components.

## Options Considered

### Option 1: i18next with react-i18next

- Pros: Widely used; `useTranslation` hook; JSON resources; fallback
  languages, interpolation and pluralization included.
- Cons: Additional dependencies; translation keys are not type-checked
  unless configured.

### Option 2: FormatJS / react-intl

- Pros: ICU message syntax; strong number and date formatting.
- Cons: More verbose message API; not yet explored in this repository.

### Option 3: Hand-written translation context

- Pros: No dependency.
- Cons: Fallbacks, interpolation and plurals would need to be built by the
  team.

## Decision

**Chosen**: Option 1 — i18next with react-i18next

It covers both required languages with little setup and is already wired
into the app and the language switcher.

## Consequences

### Positive

- Adding a language means adding one resource file and registering it in
  `src/i18n/index.js`. The language switcher lists every registered
  resource automatically.

### Negative / Trade-offs

- Translation keys are plain strings. Missing keys only show up at runtime.
- The chosen language is not persisted yet, and the user's profile language
  from the [data model](../../../concept/data-model.md) is not applied yet.

## Implementation Notes

- Configuration: `src/i18n/index.js`, default language `de`, fallback `en`.
- Resources: `src/i18n/locales/de.json` and `en.json` under a `translation`
  namespace.
- Keys and identifiers are English. Only resource values are translated.
