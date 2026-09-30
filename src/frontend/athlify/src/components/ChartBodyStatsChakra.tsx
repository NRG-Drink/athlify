import { Chart, useChart } from '@chakra-ui/charts'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

function ChartBodyStatsChakra() {
  const chart = useChart({
    data: [
      { buy: 5, sale: 10, month: 'January' },
      { buy: 15, sale: 95, month: 'February' },
      { buy: 20, sale: 87, month: 'March' },
      { buy: 25, sale: 88, month: 'May' },
      { buy: 30, sale: 65, month: 'June' },
      { buy: 25, sale: 90, month: 'August' },
    ],
    series: [
      { name: 'buy', color: 'chart.secondary' },
      { name: 'sale', color: 'chart.primary' },
    ],
  })

  return (
    <div>
      <p>Body Stats Chart</p>

      <Chart.Root maxH="sm" chart={chart}>
        <LineChart style={{ width: '100%', height: 300 }} data={chart.data} responsive>
          <CartesianGrid stroke={chart.color('border')} vertical={false} />
          <XAxis
            axisLine={false}
            dataKey={chart.key('month')}
            tickFormatter={(value) => value.slice(0, 3)}
            stroke={chart.color('border')}
          />
          <YAxis axisLine={false} tickLine={false} tickMargin={10} stroke={chart.color('border')} />
          <Tooltip animationDuration={100} cursor={false} content={<Chart.Tooltip />} />
          {chart.series.map((item) => (
            <Line
              key={item.name}
              isAnimationActive={false}
              dataKey={chart.key(item.name)}
              stroke={chart.color(item.color)}
              strokeWidth={2}
              dot={true}
            />
          ))}
        </LineChart>
      </Chart.Root>
    </div>
  )
}

export default ChartBodyStatsChakra
