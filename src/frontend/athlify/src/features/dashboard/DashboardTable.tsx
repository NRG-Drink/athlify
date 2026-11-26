import { Heading, Stack, Table, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../i18n/useFormat'
import type { ActivityBucket, BodyBucket, Grouping } from '../../lib/aggregate'
import type { FitnessDay } from '../../lib/fitness'
import type { TrendMarker } from '../../components/TrendChart'
import type { BucketLabels } from './useBucketLabels'

export interface DashboardTableProps {
  /** First day of every bucket to list, newest first. */
  starts: readonly { key: string; start: Date }[]
  grouping: Grouping
  labels: BucketLabels
  activities: ReadonlyMap<string, ActivityBucket>
  bodyStats: ReadonlyMap<string, BodyBucket>
  fitness: ReadonlyMap<string, FitnessDay>
  markers: readonly TrendMarker[]
}

/** One row per bucket with the aggregated activities, body stats, fitness and the events of the period. */
export function DashboardTable({
  starts,
  grouping,
  labels,
  activities,
  bodyStats,
  fitness,
  markers,
}: DashboardTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const measure = (value: number | undefined, decimals: number) =>
    value === undefined ? '—' : format.number(value, decimals)

  const columns: { key: string; label: string; numeric: boolean }[] = [
    { key: 'period', label: t('dashboard.table.period'), numeric: false },
    { key: 'count', label: t('dashboard.table.count'), numeric: true },
    { key: 'hours', label: t('dashboard.table.hours'), numeric: true },
    { key: 'distance', label: t('dashboard.table.distance'), numeric: true },
    { key: 'elevationGain', label: t('dashboard.table.elevationGain'), numeric: true },
    { key: 'tss', label: t('dashboard.table.tss'), numeric: true },
    { key: 'speed', label: t('dashboard.table.speed'), numeric: true },
    { key: 'weight', label: t('dashboard.table.weight'), numeric: true },
    { key: 'muscle', label: t('dashboard.table.muscle'), numeric: true },
    { key: 'fitness', label: t('dashboard.table.fitness'), numeric: true },
    { key: 'events', label: t('dashboard.table.events'), numeric: false },
  ]

  return (
    <Stack gap="3" bg="bg.panel" borderWidth="1px" borderRadius="l3" p={{ base: '4', md: '6' }}>
      <Heading as="h2" size="lg">
        {t('dashboard.table.title')}
      </Heading>
      {starts.length === 0 ? (
        <Text color="fg.muted">{t('dashboard.table.empty')}</Text>
      ) : (
        <Table.ScrollArea maxH="32rem" borderWidth="1px" borderRadius="l2">
          <Table.Root size="sm" stickyHeader css={{ tableLayout: 'auto' }}>
            <Table.Caption srOnly>{t('dashboard.table.caption')}</Table.Caption>
            <Table.Header>
              <Table.Row>
                {columns.map(({ key, label, numeric }) => (
                  <Table.ColumnHeader key={key} textAlign={numeric ? 'end' : 'start'}>
                    {label}
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {starts.map(({ key, start }) => {
                const activity = activities.get(key)
                const body = bodyStats.get(key)
                const form = fitness.get(key)
                const events = markers.filter(
                  (marker) => marker.startKey <= key && key <= marker.endKey,
                )
                return (
                  <Table.Row key={key}>
                    <Table.Cell whiteSpace="nowrap">{labels.full(start, grouping)}</Table.Cell>
                    <Table.Cell textAlign="end">{activity?.count ?? '—'}</Table.Cell>
                    <Table.Cell textAlign="end">{measure(activity?.hours, 1)}</Table.Cell>
                    <Table.Cell textAlign="end">{measure(activity?.distance, 1)}</Table.Cell>
                    <Table.Cell textAlign="end">
                      {measure(activity?.elevationGain, 0)}
                    </Table.Cell>
                    <Table.Cell textAlign="end">{measure(activity?.tss, 0)}</Table.Cell>
                    <Table.Cell textAlign="end">{measure(activity?.speed, 1)}</Table.Cell>
                    <Table.Cell textAlign="end">{measure(body?.weight, 1)}</Table.Cell>
                    <Table.Cell textAlign="end">
                      {measure(body?.musclePercentage, 1)}
                    </Table.Cell>
                    <Table.Cell textAlign="end">{measure(form?.ctl, 0)}</Table.Cell>
                    <Table.Cell>{events.map((event) => event.name).join(', ')}</Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      )}
    </Stack>
  )
}
