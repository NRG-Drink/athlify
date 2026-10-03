import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { use } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Page } from '../../components/Page'
import { QueryBoundary } from '../../components/QueryBoundary'
import { Provider } from '../../components/ui/provider'

function Broken(): never {
  throw new Error('query failed')
}

function Pending() {
  use(new Promise<never>(() => {}))
  return null
}

const renderInPage = (child: React.ReactNode, onRetry = () => {}) =>
  render(
    <Provider>
      <Page title="Garage">
        <QueryBoundary onRetry={onRetry} errorMessage="Konnte nicht geladen werden.">
          {child}
        </QueryBoundary>
      </Page>
    </Provider>,
  )

describe('QueryBoundary', () => {
  it('shows the error inside the page and keeps the heading', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderInPage(<Broken />)

    expect(screen.getByRole('alert')).toHaveTextContent('Konnte nicht geladen werden.')
    expect(screen.getByRole('heading', { level: 1, name: 'Garage' })).toBeInTheDocument()
  })

  it('retries on request and shows the content again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let broken = true
    const Maybe = () => (broken ? <Broken /> : <p>geladen</p>)
    const onRetry = vi.fn(() => {
      broken = false
    })
    renderInPage(<Maybe />, onRetry)

    await userEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }))

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('geladen')).toBeInTheDocument()
  })

  it('shows the loading indicator while the content suspends', () => {
    renderInPage(<Pending />)

    expect(screen.getByRole('status')).toHaveTextContent('Wird geladen')
  })
})
