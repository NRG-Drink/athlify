import { useChart } from '@chakra-ui/charts'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

function ChartBodyStatsRecharts() {
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
      { name: 'buy', color: 'blue.solid' },
      { name: 'sale', color: 'teal.solid' },
    ],
  })

  return (
    <div>
      <p>Body Stats Chart</p>

      {/* <Chart.Root maxH="sm" chart={chart}> */}
      <LineChart style={{ width: '100%', height: 300 }} data={chart.data} responsive>
        <CartesianGrid stroke={chart.color('border')} vertical={false} />
        <XAxis
          axisLine={false}
          dataKey={chart.key('month')}
          tickFormatter={(value) => value.slice(0, 3)}
          stroke={chart.color('border')}
        />
        <YAxis axisLine={false} tickLine={false} tickMargin={10} stroke={chart.color('border')} />
        <Tooltip animationDuration={100} cursor={false} />
        <Line
          key="buy"
          type="linear"
          isAnimationActive={false}
          dataKey={chart.key('buy')}
          stroke={chart.color('blue.solid')}
          strokeWidth={2}
          dot={true}
        />
        <Line
          key="sale"
          type="bump"
          isAnimationActive={false}
          dataKey={chart.key('sale')}
          stroke={chart.color('teal.solid')}
          strokeWidth={2}
          dot={true}
        />
      </LineChart>
      {/* </Chart.Root> */}
    </div>
  )
}

export default ChartBodyStatsRecharts
