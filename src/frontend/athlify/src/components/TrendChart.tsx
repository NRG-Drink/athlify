import { Box, Center, Stack, Text, useBreakpointValue } from '@chakra-ui/react'
import { useMemo, type ReactNode } from 'react'
import { LuChartLine } from 'react-icons/lu'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFormat } from '../i18n/useFormat'
import type { MetricUnit } from '../lib/metrics'

export interface TrendSeries {
  key: string
  label: string
  unit: MetricUnit
  decimals: number
  /** A CSS colour, normally a `var(--chakra-colors-chart-…)` token. */
  color: string
  kind: 'bar' | 'line'
  /** Values by bucket key; buckets without a value are left out. */
  values: ReadonlyMap<string, number>
}

export interface TrendBucket {
  key: string
  label: string
}

/** An event drawn at its bucket; `endKey` differs from `startKey` for events that last several buckets. */
export interface TrendMarker {
  id: string
  name: string
  color: string
  startKey: string
  endKey: string
}

export interface TrendChartProps {
  buckets: readonly TrendBucket[]
  series: readonly TrendSeries[]
  markers: readonly TrendMarker[]
  /** Accessible name; the chart is a graphic, so it also carries a text summary. */
  summary: string
  emptyMessage: string
  emptyAction?: ReactNode
  height: number
}

type Row = { key: string; label: string } & Record<string, string | number | undefined>

/** Several series over bucketed time, with the events of the period marked in the chart. */
export function TrendChart({
  buckets,
  series,
  markers,
  summary,
  emptyMessage,
  emptyAction,
  height,
}: TrendChartProps) {
  const format = useFormat()
  const maxTicks = useBreakpointValue({ base: 4, md: 10 }) ?? 4
  const data = useMemo<Row[]>(
    () =>
      buckets.map((bucket) => {
        const row: Row = { key: bucket.key, label: bucket.label }
        for (const entry of series) row[entry.key] = entry.values.get(bucket.key)
        return row
      }),
    [buckets, series],
  )
  const hasValues = series.some((entry) => entry.values.size > 0)

  if (!hasValues) {
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

  const labelByKey = new Map(buckets.map((bucket) => [bucket.key, bucket.label]))
  const interval = Math.max(0, Math.ceil(buckets.length / maxTicks) - 1)

  return (
    <Box
      role="img"
      aria-label={summary}
      h={`${height}px`}
      w="full"
      css={{ '& *:focus': { outline: 'none' } }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chakra-colors-border)" vertical={false} />
          <XAxis
            dataKey="label"
            interval={interval}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            stroke="var(--chakra-colors-fg-muted)"
          />
          <YAxis
            tickFormatter={(value: number) => format.number(value, 0)}
            axisLine={false}
            tickLine={false}
            width={44}
            stroke="var(--chakra-colors-fg-muted)"
          />
          <Tooltip
            cursor={{ stroke: 'var(--chakra-colors-border)' }}
            content={<TrendTooltip series={series} markers={markers} />}
          />
          {markers.map((marker) => {
            const start = labelByKey.get(marker.startKey)
            const end = labelByKey.get(marker.endKey)
            if (start === undefined || end === undefined) return null
            return marker.startKey === marker.endKey ? (
              <ReferenceLine
                key={marker.id}
                x={start}
                stroke={marker.color}
                strokeWidth={2}
                strokeDasharray="4 3"
                ifOverflow="visible"
              />
            ) : (
              <ReferenceArea
                key={marker.id}
                x1={start}
                x2={end}
                fill={marker.color}
                fillOpacity={0.15}
                ifOverflow="visible"
              />
            )
          })}
          {series.map((entry) =>
            entry.kind === 'bar' ? (
              <Bar
                key={entry.key}
                dataKey={entry.key}
                fill={entry.color}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={entry.key}
                dataKey={entry.key}
                stroke={entry.color}
                strokeWidth={2}
                dot={buckets.length <= 40 ? { r: 2.5 } : false}
                connectNulls
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  )
}

interface TrendTooltipProps {
  // Injected by Recharts when it renders the tooltip element.
  active?: boolean
  payload?: ReadonlyArray<{ payload?: unknown }>
  series: readonly TrendSeries[]
  markers: readonly TrendMarker[]
}

function TrendTooltip({ active, payload, series, markers }: TrendTooltipProps) {
  const format = useFormat()
  const row = payload?.[0]?.payload as Row | undefined
  if (!active || !row) return null
  const events = markers.filter((marker) => marker.startKey <= row.key && row.key <= marker.endKey)

  return (
    <Stack gap="1" bg="bg.panel" borderWidth="1px" borderRadius="l2" px="3" py="2" shadow="md">
      <Text fontSize="sm" color="fg.muted">
        {row.label}
      </Text>
      {series.map((entry) => (
        <Text key={entry.key} fontSize="sm">
          {entry.label}:{' '}
          <Text as="span" textStyle="kpi">
            {format.measure(row[entry.key] as number | undefined, entry.unit, entry.decimals)}
          </Text>
        </Text>
      ))}
      {events.map((event) => (
        <Text key={event.id} fontSize="sm" style={{ color: event.color }}>
          {event.name}
        </Text>
      ))}
    </Stack>
  )
}
