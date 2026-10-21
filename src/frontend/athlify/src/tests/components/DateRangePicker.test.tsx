import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DateRangePicker } from '../../components/DateRangePicker'
import { Provider } from '../../components/ui/provider'

const range = { from: '2026-07-05', to: '2026-10-03' }

const renderPicker = (onChange = vi.fn()) => {
  const result = render(
    <Provider>
      <DateRangePicker value={range} onChange={onChange} />
    </Provider>,
  )
  return { ...result, onChange }
}

describe('DateRangePicker', () => {
  it('shows the committed range and opens two labeled date inputs', async () => {
    const user = userEvent.setup()
    renderPicker()

    expect(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ })).toHaveTextContent(
      'Zeitraum: 5. Juli 2026 – 3. Okt. 2026',
    )
    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    expect(screen.getByLabelText('Von')).toHaveValue('2026-07-05')
    expect(screen.getByLabelText('Bis')).toHaveValue('2026-10-03')
    expect(screen.getByRole('button', { name: 'Anwenden' })).toBeInTheDocument()
  })

  it('rejects a reversed range without committing it', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    await user.clear(screen.getByLabelText('Von'))
    await user.type(screen.getByLabelText('Von'), '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Das Startdatum muss vor dem Enddatum liegen.',
    )
  })

  it('commits both valid bounds together', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    await user.clear(screen.getByLabelText('Von'))
    await user.type(screen.getByLabelText('Von'), '2026-01-01')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onChange).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-10-03' })
  })
})
