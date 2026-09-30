import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import i18n from 'i18next'
import '../i18n'

// jsdom lacks these browser APIs; next-themes and Ark UI (Chakra) call them.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

Element.prototype.scrollTo ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

beforeEach(async () => {
  await i18n.changeLanguage('de')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
