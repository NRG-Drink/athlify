import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { KpiTile } from '../../components/KpiTile'
import { Provider } from '../../components/ui/provider'

const renderTile = (props: Partial<React.ComponentProps<typeof KpiTile>> = {}) =>
  render(
    <Provider>
      <KpiTile
        label="Gewicht"
        unit="kg"
        note="in 90 Tagen"
        selected={false}
        onSelect={() => {}}
        {...props}
      />
    </Provider>,
  )

describe('KpiTile', () => {
  it('shows value, unit, change and comparison period', () => {
    renderTile({ value: '70.5', delta: { text: '−0.7 kg', direction: 'down' } })

    const tile = screen.getByRole('button')
    expect(tile).toHaveTextContent('Gewicht')
    expect(tile).toHaveTextContent('70.5')
    expect(tile).toHaveTextContent('kg')
    expect(tile).toHaveTextContent('−0.7 kg in 90 Tagen')
  })

  it('shows an em dash instead of zero when there is no data', () => {
    renderTile({ note: 'Keine Messung' })

    const tile = screen.getByRole('button')
    expect(tile).toHaveTextContent('—')
    expect(tile).not.toHaveTextContent('0')
    expect(tile).toHaveTextContent('Keine Messung')
    expect(tile).not.toHaveTextContent('kg')
  })

  it('reports whether it is selected and selects on click', async () => {
    const onSelect = vi.fn()
    const { rerender } = renderTile({ value: '70.5', onSelect })
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledTimes(1)

    rerender(
      <Provider>
        <KpiTile label="Gewicht" unit="kg" note="x" value="70.5" selected onSelect={onSelect} />
      </Provider>,
    )
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })
})
