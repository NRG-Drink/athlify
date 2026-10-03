import { Box, Center, Stack, Text, useBreakpointValue } from '@chakra-ui/react'
import { useMemo, type ReactNode } from 'react'
import { LuChartLine } from 'react-icons/lu'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFormat } from '../i18n/useFormat'
import type { MetricPoint, MetricUnit } from '../lib/metrics'
import { niceScale, timeTicks } from '../lib/ticks'

export interface MetricChartProps {
  /** Already filtered to the period and sorted oldest first. */
  points: readonly MetricPoint[]
  unit: MetricUnit
  decimals: number
  /** Accessible name; the chart is a graphic, so it also carries a text summary. */
  summary: string
  /** Time span shown on the X axis, for the period boundary and the tick format. */
  domain: [Date, Date]
  emptyMessage: string
  /** Shown under the empty message, for example a button that widens the period. */
  emptyAction?: ReactNode
  height?: number
}

const DAY = 24 * 60 * 60 * 1000
const MAX_DOTS = 60

const spanFor = (domain: [Date, Date]): 'days' | 'months' | 'years' => {
  const days = (domain[1].getTime() - domain[0].getTime()) / DAY
  return days <= 45 ? 'days' : days <= 400 ? 'months' : 'years'
}

/**
 * One measurement over a real time axis. Recharts stays behind this interface so the chart
 * library can be replaced without touching any page.
 */
export function MetricChart({
  points,
  unit,
  decimals,
  summary,
  domain,
  emptyMessage,
  emptyAction,
  height = 240,
}: MetricChartProps) {
  const format = useFormat()
  const maxTicks = useBreakpointValue({ base: 4, md: 6 }) ?? 4
  const data = useMemo(
    () => points.map((point) => ({ time: point.date.getTime(), value: point.value })),
    [points],
  )

  if (data.length === 0) {
    return (
      <Center h={`${height}px`}>
        <Stack align="center" gap="3" textAlign="center">
          <Box color="fg.muted" fontSize="2xl">
            <LuChartLine aria-hidden />
          </Box>
          <Text color="fg.muted">{emptyMessage}</Text>
          {emptyAction}
        </Stack>
      </Center>
    )
  }

  const values = data.map((entry) => entry.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const scale = niceScale(min, max, 4)
  const span = spanFor(domain)

  return (
    <Box
      role="img"
      aria-label={summary}
      h={`${height}px`}
      w="full"
      css={{ '& *:focus': { outline: 'none' } }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chakra-colors-border)" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={[domain[0].getTime(), domain[1].getTime()]}
            ticks={timeTicks(domain[0], domain[1], maxTicks)}
            tickFormatter={(value: number) => format.axisDate(value, span)}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            stroke="var(--chakra-colors-fg-muted)"
          />
          <YAxis
            domain={scale.domain}
            ticks={scale.ticks}
            tickFormatter={(value: number) => format.number(value, decimals)}
            axisLine={false}
            tickLine={false}
            width={44}
            stroke="var(--chakra-colors-fg-muted)"
          />
          <Tooltip
            cursor={{ stroke: 'var(--chakra-colors-border)' }}
            content={<ChartTooltip unit={unit} decimals={decimals} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chakra-colors-chart-primary)"
            strokeWidth={2}
            fill="var(--chakra-colors-chart-primary)"
            fillOpacity={0.08}
            dot={
              data.length <= MAX_DOTS
                ? {
                    r: 3,
                    strokeWidth: 2,
                    stroke: 'var(--chakra-colors-chart-primary)',
                    fill: 'var(--chakra-colors-bg-panel)',
                  }
                : false
            }
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  )
}

interface ChartTooltipProps {
  // Injected by Recharts when it renders the tooltip element.
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  unit: MetricUnit
  decimals: number
}

function ChartTooltip({ active, payload, unit, decimals }: ChartTooltipProps) {
  const format = useFormat()
  const entry = payload?.[0]?.payload as { time: number; value: number } | undefined
  if (!active || !entry) return null

  return (
    <Stack gap="0" bg="bg.panel" borderWidth="1px" borderRadius="l2" px="3" py="2" shadow="md">
      <Text fontSize="sm" color="fg.muted">
        {format.dateTime(new Date(entry.time))}
      </Text>
      <Text textStyle="kpi" fontSize="xl">
        {format.measure(entry.value, unit, decimals)}
      </Text>
    </Stack>
  )
}
