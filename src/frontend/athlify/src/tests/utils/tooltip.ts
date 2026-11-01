import { expect } from 'vitest'

/** Longer than the tooltip open delay of `DataTable` headers (300 ms). */
const TOOLTIP_DELAY_MS = 400

/**
 * Asserts that no tooltip opened. jsdom does not expose an open Chakra tooltip through
 * `getByRole('tooltip')`, so a role query would always pass; the tooltip content element is checked
 * after the open delay instead.
 */
export async function expectNoTooltip() {
  await new Promise((resolve) => setTimeout(resolve, TOOLTIP_DELAY_MS))
  expect(document.querySelector('[data-scope="tooltip"][data-part="content"]')).toBeNull()
}
