import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import i18n from 'i18next'
import '../i18n'
import { toaster } from '../components/ui/toaster'

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
  // A modal that is still open when a test ends leaves these on <body>, which would block the
  // pointer interactions of the next test.
  document.body.removeAttribute('style')
  document.body.removeAttribute('data-inert')
  // The toaster is a module-level store: a toast of one test would otherwise show in the next.
  toaster.remove()
  vi.restoreAllMocks()
})
