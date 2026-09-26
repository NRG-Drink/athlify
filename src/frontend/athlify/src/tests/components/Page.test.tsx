import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { Page } from '../../components/Page'
import { Provider } from '../../components/ui/provider'

function renderPage(ui: ReactElement) {
  return render(<Provider>{ui}</Provider>)
}

describe('Page', () => {
  test('ready renders title, actions and children', () => {
    renderPage(
      <Page title="Garage" actions={<button type="button">Neu</button>}>
        <p>content</p>
      </Page>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Garage' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Neu' })).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(document.title).toBe('Garage · Athlify')
  })

  test('loading shows a status and hides children', () => {
    renderPage(
      <Page title="Garage" status="loading">
        <p>content</p>
      </Page>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Wird geladen')
    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  test('empty shows the empty message and hides children', () => {
    renderPage(
      <Page title="Garage" status="empty" emptyMessage="Noch keine Velos.">
        <p>content</p>
      </Page>,
    )
    expect(screen.getByText('Noch keine Velos.')).toBeInTheDocument()
    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  test('error with onRetry shows an alert and a working retry button', async () => {
    const onRetry = vi.fn()
    renderPage(<Page title="Garage" status="error" onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Die Daten konnten nicht geladen werden.')
    await userEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  test('error without onRetry has no retry button', () => {
    renderPage(<Page title="Garage" status="error" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).not.toBeInTheDocument()
  })
})
