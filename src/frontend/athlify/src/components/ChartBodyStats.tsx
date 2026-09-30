import { Chart, useChart } from '@chakra-ui/charts'
import { useTranslation } from 'react-i18next'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { BodyStatsEntry } from './bodyStatsTypes'

interface ChartBodyStatsProps {
  bodyStats: ReadonlyArray<BodyStatsEntry>
}

function ChartBodyStats({ bodyStats }: ChartBodyStatsProps) {
  const { t } = useTranslation()
  const chart = useChart({
    data: bodyStats.map((entry) => ({
      weight: entry.weight,
      bodyFatPercentage: entry.bodyFatPercentage,
      musclePercentage: entry.musclePercentage,
      waterPercentage: entry.waterPercentage,
      boneMass: entry.boneMass,
      date: new Date(entry.date as string).toLocaleString(),
    })),
    series: [
      { name: 'weight', label: t('bodyStats.fields.weight'), color: 'chart.primary' },
      {
        name: 'bodyFatPercentage',
        label: t('bodyStats.fields.bodyFatPercentage'),
        color: 'chart.secondary',
      },
      {
        name: 'musclePercentage',
        label: t('bodyStats.fields.musclePercentage'),
        color: 'orange.solid',
      },
      {
        name: 'waterPercentage',
        label: t('bodyStats.fields.waterPercentage'),
        color: 'cyan.solid',
      },
      { name: 'boneMass', label: t('bodyStats.fields.boneMass'), color: 'purple.solid' },
    ],
  })

  return (
    <div>
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
          <Line
            key="bodyFatPercentage"
            type="monotone"
            isAnimationActive={false}
            dataKey={chart.key('bodyFatPercentage')}
            stroke={chart.color('chart.secondary')}
            strokeWidth={2}
            dot={true}
          />
          <Line
            key="musclePercentage"
            type="monotone"
            isAnimationActive={false}
            dataKey={chart.key('musclePercentage')}
            stroke={chart.color('orange.solid')}
            strokeWidth={2}
            dot={true}
          />
          <Line
            key="waterPercentage"
            type="monotone"
            isAnimationActive={false}
            dataKey={chart.key('waterPercentage')}
            stroke={chart.color('cyan.solid')}
            strokeWidth={2}
            dot={true}
          />
          <Line
            key="boneMass"
            type="monotone"
            isAnimationActive={false}
            dataKey={chart.key('boneMass')}
            stroke={chart.color('purple.solid')}
            strokeWidth={2}
            dot={true}
          />
        </LineChart>
      </Chart.Root>
    </div>
  )
}

export default ChartBodyStats
