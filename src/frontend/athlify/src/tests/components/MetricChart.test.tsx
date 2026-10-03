import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricChart } from '../../components/MetricChart'
import { Provider } from '../../components/ui/provider'

const domain: [Date, Date] = [new Date(2026, 8, 3), new Date(2026, 9, 3)]

const renderChart = (props: Partial<React.ComponentProps<typeof MetricChart>> = {}) =>
  render(
    <Provider>
      <MetricChart
        points={[
          { date: new Date(2026, 8, 30), value: 71.2 },
          { date: new Date(2026, 9, 2), value: 70.5 },
        ]}
        unit="kg"
        decimals={1}
        summary="Gewicht, Letzte 30 Tage: von 71.2 kg auf 70.5 kg, 2 Messungen"
        domain={domain}
        emptyMessage="Keine Messungen in den letzten 30 Tagen"
        {...props}
      />
    </Provider>,
  )

describe('MetricChart', () => {
  it('is a graphic with a text summary of the data', () => {
    renderChart()

    expect(
      screen.getByRole('img', { name: /von 71\.2 kg auf 70\.5 kg, 2 Messungen/ }),
    ).toBeInTheDocument()
  })

  it('shows the empty message and its action instead of an empty chart', () => {
    renderChart({
      points: [],
      emptyAction: <button type="button">Ganzen Zeitraum anzeigen</button>,
    })

    expect(screen.getByText('Keine Messungen in den letzten 30 Tagen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ganzen Zeitraum anzeigen' })).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
