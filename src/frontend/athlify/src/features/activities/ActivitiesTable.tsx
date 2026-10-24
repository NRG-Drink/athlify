import { Button, Flex, Tag, Text } from '@chakra-ui/react'
import { useMemo, type ReactNode } from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { DataTable, type DataTableColumn } from '../../components/DataTable'
import { useFormat } from '../../i18n/useFormat'
import { ActivityFilterField } from './ActivityFilterField'
import {
  activeFilterSummary,
  filterColumnBreakpoint,
  filterValueCount,
  type ActivityFilterKey,
  type ActivityFilters,
  type FilterOption,
} from './activityFilters'
import {
  enumLabel,
  formatDuration,
  formatHeartRate,
  formatOptionalNumber,
  moodRank,
  tagColorPalette,
  vehicleLabel,
  windRank,
} from './activityFormatting'
import type {
  ActivitiesTable_entries$data,
  ActivitiesTable_entries$key,
} from './__generated__/ActivitiesTable_entries.graphql'

const tableFragment = graphql`
  fragment ActivitiesTable_entries on Activity @relay(plural: true) {
    id
    date
    type
    description
    time
    distance
    averageSpeed
    elevationGain
    tss
    heartRateMin
    heartRateMax
    heartRateAverage
    mood
    effort
    wind
    vehicle {
      id
      brand
      model
      nickname
    }
    gadgets {
      id
      brand
      model
      nickname
    }
    tags {
      id
      name
    }
  }
`

export type ActivityRow = ActivitiesTable_entries$data[number]

const gadgetNames = (row: ActivityRow) => row.gadgets.map(vehicleLabel).join(', ')
const tagNames = (row: ActivityRow) => row.tags.map((tag) => tag.name).join(', ')

const VISIBLE_TAGS = 2

/** One line: the first tags as chips, the rest as a "+N" chip; the title lists all of them. */
function TagChips({ row }: { row: ActivityRow }) {
  const { t } = useTranslation()
  if (row.tags.length === 0) return '—'
  return (
    <Flex gap="1" wrap="nowrap" overflow="hidden" title={tagNames(row)}>
      {row.tags.slice(0, VISIBLE_TAGS).map((tag) => (
        <Tag.Root
          key={tag.id}
          size="sm"
          variant="subtle"
          flexShrink={0}
          colorPalette={tagColorPalette(tag.id)}
        >
          <Tag.Label>{tag.name}</Tag.Label>
        </Tag.Root>
      ))}
      {row.tags.length > VISIBLE_TAGS && (
        <Tag.Root size="sm" variant="outline" flexShrink={0}>
          <Tag.Label>
            {t('activities.moreTags', { count: row.tags.length - VISIBLE_TAGS })}
          </Tag.Label>
        </Tag.Root>
      )}
    </Flex>
  )
}

/** Shows the full text as a tooltip, because truncated cells hide the end. */
const titled = (text: string) => (text ? <span title={text}>{text}</span> : '—')

/** Secondary data: hidden on narrow screens and shown in a muted colour. */
const secondary = { hideBelow: '2xl', muted: true } as const

interface ActivitiesTableProps {
  entries: ActivitiesTable_entries$key
  hasNextPage: boolean
  isLoadingNext: boolean
  loadMoreError: boolean
  onLoadMore: () => void
  filters: ActivityFilters
  vehicles: readonly FilterOption[]
  tags: readonly FilterOption[]
  hasMoreVehicles: boolean
  hasMoreTags: boolean
  onFiltersChange: (value: ActivityFilters) => void
  /** The data is being refreshed after a filter change. */
  busy: boolean
  /** Shown in the table body when nothing matches; the header and its filters stay. */
  emptyMessage?: ReactNode
}

export function ActivitiesTable({
  entries,
  hasNextPage,
  isLoadingNext,
  loadMoreError,
  onLoadMore,
  filters,
  vehicles,
  tags,
  hasMoreVehicles,
  hasMoreTags,
  onFiltersChange,
  busy,
  emptyMessage,
}: ActivitiesTableProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const rows = useFragment(tableFragment, entries)

  const columnFilters = useMemo(() => {
    const filterFor = (key: ActivityFilterKey) => {
      const column = t(`activities.filters.${key}`)
      const count = filterValueCount(key, filters)
      return {
        title: column,
        label: t('activities.filters.filterBy', { column }),
        active: count > 0,
        count,
        activeLabel: t('activities.filters.filterByActive', {
          column,
          value: activeFilterSummary(key, filters, vehicles, tags, t),
        }),
        // The panel stays open while values are ticked; its "Fertig" button closes it.
        content: () => (
          <ActivityFilterField
            field={key}
            value={filters}
            vehicles={vehicles}
            tags={tags}
            hasMoreVehicles={hasMoreVehicles}
            hasMoreTags={hasMoreTags}
            onChange={onFiltersChange}
          />
        ),
      }
    }
    return {
      type: filterFor('type'),
      vehicle: filterFor('vehicle'),
      tags: filterFor('tag'),
      wind: filterFor('wind'),
    }
  }, [t, filters, vehicles, tags, hasMoreVehicles, hasMoreTags, onFiltersChange])

  const columns = useMemo<DataTableColumn<ActivityRow>[]>(
    () => [
      {
        id: 'date',
        header: t('activities.columns.date'),
        accessor: (row) => new Date(row.date).getTime(),
        cell: (row) => <time dateTime={row.date}>{format.date(row.date)}</time>,
        width: '8rem',
      },
      {
        id: 'type',
        header: t('activities.columns.type'),
        accessor: (row) => row.type,
        cell: (row) => t(`activities.types.${row.type}`),
        filter: columnFilters.type,
      },
      {
        id: 'description',
        header: t('activities.columns.description'),
        accessor: (row) => row.description ?? '',
        cell: (row) => titled(row.description ?? ''),
        hideBelow: 'md',
        truncate: true,
        minWidth: '12rem',
        maxWidth: '24rem',
      },
      {
        id: 'time',
        header: t('activities.columns.duration'),
        accessor: (row) => row.time,
        cell: (row) => formatDuration(row.time),
        align: 'end',
        unit: t('activities.units.duration'),
      },
      {
        id: 'distance',
        header: t('activities.columns.distance'),
        accessor: (row) => row.distance,
        cell: (row) => formatOptionalNumber(format, row.distance, 1),
        align: 'end',
        unit: t('activities.units.distance'),
      },
      {
        id: 'vehicle',
        header: t('activities.columns.vehicle'),
        accessor: (row) => (row.vehicle ? vehicleLabel(row.vehicle) : ''),
        cell: (row) =>
          row.vehicle ? (
            <Text truncate maxW="12rem">
              {vehicleLabel(row.vehicle)}
            </Text>
          ) : (
            '—'
          ),
        hideBelow: filterColumnBreakpoint.vehicle,
        truncate: true,
        filter: columnFilters.vehicle,
      },
      {
        id: 'elevationGain',
        header: t('activities.columns.elevationGain'),
        accessor: (row) => row.elevationGain ?? -1,
        cell: (row) => formatOptionalNumber(format, row.elevationGain, 0),
        align: 'end',
        unit: t('activities.units.elevation'),
        hideBelow: 'lg',
      },
      {
        id: 'averageSpeed',
        header: t('activities.columns.speed'),
        accessor: (row) => row.averageSpeed ?? -1,
        cell: (row) => formatOptionalNumber(format, row.averageSpeed, 1),
        align: 'end',
        unit: t('activities.units.speed'),
        hideBelow: 'lg',
      },
      {
        id: 'tss',
        header: t('activities.columns.tss'),
        accessor: (row) => row.tss ?? -1,
        cell: (row) => (row.tss == null ? '—' : format.number(row.tss, 0)),
        align: 'end',
        hideBelow: 'lg',
      },
      {
        id: 'heartRate',
        header: t('activities.columns.heartRate'),
        accessor: (row) => row.heartRateAverage ?? -1,
        cell: (row) => {
          const { text, title } = formatHeartRate(
            row.heartRateAverage,
            row.heartRateMin,
            row.heartRateMax,
          )
          return title ? <span title={title}>{text}</span> : text
        },
        align: 'end',
        unit: t('activities.units.heartRate'),
        ...secondary,
      },
      {
        id: 'effort',
        header: t('activities.columns.effort'),
        accessor: (row) => row.effort ?? -1,
        cell: (row) => row.effort ?? '—',
        align: 'end',
        unit: t('activities.units.effort'),
        ...secondary,
      },
      {
        id: 'mood',
        header: t('activities.columns.mood'),
        accessor: (row) => moodRank(row.mood),
        cell: (row) => enumLabel(t, 'moods', row.mood),
        ...secondary,
      },
      {
        id: 'wind',
        header: t('activities.columns.wind'),
        accessor: (row) => windRank(row.wind),
        cell: (row) => enumLabel(t, 'winds', row.wind),
        ...secondary,
        hideBelow: filterColumnBreakpoint.wind,
        filter: columnFilters.wind,
      },
      {
        id: 'gadgets',
        header: t('activities.columns.gadgets'),
        accessor: gadgetNames,
        cell: (row) => titled(gadgetNames(row)),
        ...secondary,
        truncate: true,
        minWidth: '8rem',
        maxWidth: '14rem',
      },
      {
        id: 'tags',
        header: t('activities.columns.tags'),
        accessor: tagNames,
        cell: (row) => <TagChips row={row} />,
        ...secondary,
        hideBelow: filterColumnBreakpoint.tag,
        filter: columnFilters.tags,
        minWidth: '8rem',
        maxWidth: '14rem',
      },
    ],
    [t, format, columnFilters],
  )

  return (
    <Flex direction="column" gap="3">
      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        initialSort={{ id: 'date', desc: true }}
        caption={t('activities.table.caption')}
        busy={busy}
        emptyMessage={emptyMessage}
      />
      {loadMoreError && (
        <Flex align="center" justify="space-between" gap="3" wrap="wrap">
          <Text role="alert" color="fg.error">
            {t('activities.loadMoreFailed')}
          </Text>
          <Button size="sm" variant="outline" onClick={onLoadMore}>
            {t('page.retry')}
          </Button>
        </Flex>
      )}
      {hasNextPage && !loadMoreError && (
        <Button alignSelf="center" variant="outline" loading={isLoadingNext} onClick={onLoadMore}>
          {t('activities.loadMore')}
        </Button>
      )}
    </Flex>
  )
}
