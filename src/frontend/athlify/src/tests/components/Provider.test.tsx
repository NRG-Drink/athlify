import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Provider } from '../../components/ui/provider'

function prefersDark(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: dark && query.includes('prefers-color-scheme: dark'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  )
}

describe('color mode default', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  test('follows a dark system preference when the user has not chosen a mode', async () => {
    prefersDark(true)
    render(<Provider />)
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'))
  })

  test('follows a light system preference when the user has not chosen a mode', async () => {
    prefersDark(false)
    render(<Provider />)
    await waitFor(() => expect(document.documentElement).toHaveClass('light'))
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
