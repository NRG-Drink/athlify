import { Chart, useChart } from '@chakra-ui/charts'
import { Suspense } from 'react'
import { graphql, useLazyLoadQuery } from 'react-relay'
import { Bar, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartBodyStatsHybridQuery } from './__generated__/ChartBodyStatsHybridQuery.graphql'

const bodyStatsQuery = graphql`
  query ChartBodyStatsHybridQuery {
    bodyStats {
      date
      weight
      bodyFatPercentage
      musclePercentage
      waterPercentage
      boneMass
    }
  }
`

function ChartBodyStatsHybridContent() {
  const { bodyStats } = useLazyLoadQuery<ChartBodyStatsHybridQuery>(bodyStatsQuery, {})

  const chart = useChart({
    data: bodyStats.map((entry) => ({
      weight: entry.weight,
      bodyFatPercentage: entry.bodyFatPercentage,
      musclePercentage: entry.musclePercentage,
      waterPercentage: entry.waterPercentage,
      boneMass: entry.boneMass,
      date: new Date(entry.date as string).toLocaleDateString(),
    })),
    series: [
      { name: 'weight', color: 'chart.secondary' },
      { name: 'bodyFatPercentage', color: 'chart.primary' },
      { name: 'musclePercentage', color: 'orange.solid' },
      { name: 'waterPercentage', color: 'cyan.solid' },
      { name: 'boneMass', color: 'purple.solid' },
    ],
  })

  return (
    <div>
      <p>Body Stats Chart Hybrid</p>

      <Chart.Root maxH="sm" chart={chart}>
        <LineChart style={{ width: '100%', height: 300 }} data={chart.data} responsive>
          <CartesianGrid stroke={chart.color('border')} vertical={false} />
          <XAxis axisLine={false} dataKey={chart.key('date')} stroke={chart.color('border')} />
          <YAxis axisLine={false} tickLine={false} tickMargin={10} stroke={chart.color('border')} />
          <Tooltip animationDuration={100} cursor={false} content={<Chart.Tooltip />} />
          <Line
            key="weight"
            type="monotone"
            isAnimationActive={false}
            dataKey={chart.key('weight')}
            stroke={chart.color('chart.primary')}
            strokeWidth={2}
            dot={true}
          />
          <Bar
            key="bodyFatPercentage"
            isAnimationActive={false}
            dataKey={chart.key('bodyFatPercentage')}
            stroke={chart.color('chart.secondary')}
            strokeWidth={2}
            fill={chart.color('chart.secondary')}
            barSize={20}
          />
        </LineChart>
      </Chart.Root>
    </div>
  )
}

function ChartBodyStatsHybrid() {
  return (
    <Suspense fallback={<p>Loading body stats…</p>}>
      <ChartBodyStatsHybridContent />
    </Suspense>
  )
}

export default ChartBodyStatsHybrid
