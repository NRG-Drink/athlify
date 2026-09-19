import { Chart, useChart } from '@chakra-ui/charts'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

function ChartBodyStats() {
  const chart = useChart({
    data: [
      { month: 'January', value: 100 },
      { month: 'February', value: 200 },
    ],
  })

  return (
    <div>
      <p>Chart Body Stats</p>

      <Chart.Root chart={chart}>
        <BarChart data={chart.data}>
          {chart.series.map((item) => (
            <Bar key={item.name} dataKey={chart.key(item.name)} fill={chart.color(item.color)} />
          ))}
        </BarChart>
      </Chart.Root>
    </div>
  )
}

export default ChartBodyStats
