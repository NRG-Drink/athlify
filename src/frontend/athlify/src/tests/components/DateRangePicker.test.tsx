import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DateRangePicker } from '../../components/DateRangePicker'
import { Provider } from '../../components/ui/provider'

const selection = {
  range: { from: '2026-07-05', to: '2026-10-03' },
  aggregation: 'day' as const,
}

const renderPicker = (onChange = vi.fn()) => {
  const result = render(
    <Provider>
      <DateRangePicker value={selection} onChange={onChange} />
    </Provider>,
  )
  return { ...result, onChange }
}

describe('DateRangePicker', () => {
  it('shows the committed range and opens two labeled date inputs', async () => {
    const user = userEvent.setup()
    renderPicker()

    expect(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ })).toHaveTextContent(
      'Zeitraum: 05.07.2026 – 03.10.2026 · 1 T',
    )
    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    expect(screen.getByRole('textbox', { name: 'Von' })).toHaveValue('05.07.2026')
    expect(screen.getByRole('textbox', { name: 'Bis' })).toHaveValue('03.10.2026')
    expect(screen.getByLabelText('Auflösung')).toHaveValue('day')
    expect(screen.getByRole('option', { name: 'Keine' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anwenden' })).toBeInTheDocument()
  })

  it('rejects a reversed range without committing it', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    await user.clear(screen.getByRole('textbox', { name: 'Von' }))
    await user.type(screen.getByRole('textbox', { name: 'Von' }), '01.11.2026')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onChange).not.toHaveBeenCalled()
    // The calendar has its own (empty) live region, so the error is found by its text.
    expect(screen.getByText('Das Startdatum muss vor dem Enddatum liegen.')).toHaveAttribute(
      'role',
      'alert',
    )
  })

  it('keeps an invalid typed date and reports it', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    const from = screen.getByRole('textbox', { name: 'Von' })
    await user.clear(from)
    await user.type(from, '1.1.')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(from).toHaveValue('1.1.')
    expect(screen.getByText('Bitte gib die Daten im Format TT.MM.JJJJ ein.')).toBeInTheDocument()
  })

  it('commits both valid bounds together', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    await user.clear(screen.getByRole('textbox', { name: 'Von' }))
    await user.type(screen.getByRole('textbox', { name: 'Von' }), '1.1.26')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onChange).toHaveBeenCalledWith({
      range: { from: '2026-01-01', to: '2026-10-03' },
      aggregation: 'day',
    })
  })

  it('commits the selected aggregation with the date range', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    await user.selectOptions(screen.getByLabelText('Auflösung'), 'month')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onChange).toHaveBeenCalledWith({
      range: selection.range,
      aggregation: 'month',
    })
  })

  it('allows aggregation to be disabled', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getByRole('button', { name: /Zeitraum ändern: Zeitraum:/ }))
    await user.selectOptions(screen.getByLabelText('Auflösung'), 'none')
    await user.click(screen.getByRole('button', { name: 'Anwenden' }))

    expect(onChange).toHaveBeenCalledWith({
      range: selection.range,
      aggregation: 'none',
    })
  })
})
