import { Flex, IconButton, Menu, Portal, Tag, Text } from '@chakra-ui/react'
import { memo, useMemo, type ReactNode, type Ref } from 'react'
import { graphql, useFragment } from 'react-relay'
import { useTranslation } from 'react-i18next'
import { LuCopy, LuEllipsis, LuTrash2 } from 'react-icons/lu'
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
  effortLevel,
  enumLabel,
  formatDuration,
  formatHeartRate,
  formatOptionalNumber,
  moodEmoji,
  moodRank,
  tagColorPalette,
  vehicleLabel,
  windEmoji,
  windRank,
} from './activityFormatting'
import { isSortColumn, type ListSort } from '../../lib/sort'
import { activitySortColumns, type ActivitySort } from './activityQuery'
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
    source
    merge {
      id
    }
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

interface RowActionsProps {
  row: ActivityRow
  onDuplicate: (row: ActivityRow) => void
  onDelete: (row: ActivityRow) => void
}

/** Duplicate and the destructive delete (last) in a menu; a click on the row itself edits. */
function RowActions({ row, onDuplicate, onDelete }: RowActionsProps) {
  const { t } = useTranslation()
  const format = useFormat()
  const date = format.date(row.date)
  return (
    <Flex gap="1" justify="flex-end">
      <Menu.Root positioning={{ placement: 'bottom-end' }}>
        <Menu.Trigger asChild>
          <IconButton
            variant="ghost"
            size="sm"
            color="fg.muted"
            aria-label={t('activities.row.more', { date })}
          >
            <LuEllipsis />
          </IconButton>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            {/* Portals leave the app's brand palette, so the menu sets it again. */}
            <Menu.Content colorPalette="brand">
              {/* onClick, not onSelect: in the page tests onSelect never fired (see frontend
                  LEARNINGS); Enter on a highlighted item clicks it, so the keyboard works too. */}
              <Menu.Item value="duplicate" onClick={() => onDuplicate(row)}>
                <LuCopy aria-hidden />
                {t('activities.duplicate.action')}
              </Menu.Item>
              <Menu.Separator />
              <Menu.Item
                value="delete"
                color="fg.error"
                _highlighted={{ bg: 'bg.error' }}
                onClick={() => onDelete(row)}
              >
                <LuTrash2 aria-hidden />
                {t('activities.delete.action')}
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Flex>
  )
}

/**
 * A mood or wind as its emoji; the label is its accessible name and tooltip. A value without an emoji
 * (newer than this client) shows its label, and a missing one "—".
 */
function EmojiValue({ emoji, label }: { emoji: string | undefined; label: string }) {
  if (!emoji) return <>{label}</>
  return (
    <Text as="span" role="img" aria-label={label} title={label} fontSize="lg" lineHeight="1">
      {emoji}
    </Text>
  )
}

/** The effort with the emoji of its group before the number; the group's name is the tooltip. */
function EffortValue({ effort }: { effort: number | null | undefined }) {
  const { t } = useTranslation()
  const level = effortLevel(t, effort)
  if (effort == null || !level) return <>—</>
  return (
    <Text as="span" title={level.label} whiteSpace="nowrap">
      <span aria-hidden>{level.emoji}</span> {effort}
    </Text>
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
  /** Server-side order; the rows arrive sorted. */
  sort: ActivitySort
  onSortChange: (sort: ActivitySort) => void
  /** Number of activities matching the filters, across all pages. */
  totalCount: number
  /** The data is being refreshed after a filter change. */
  busy: boolean
  /** Shown in the table body when nothing matches; the header and its filters stay. */
  emptyMessage?: ReactNode
  onEdit: (row: ActivityRow) => void
  onDuplicate: (row: ActivityRow) => void
  onDelete: (row: ActivityRow) => void
  /** The count line, which takes the focus after a delete. */
  countRef?: Ref<HTMLParagraphElement>
}

/** Memoized: the page re-renders for its dialogs, which does not change the rows. */
export const ActivitiesTable = memo(function ActivitiesTable({
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
  sort,
  onSortChange,
  totalCount,
  busy,
  emptyMessage,
  onEdit,
  onDuplicate,
  onDelete,
  countRef,
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
        sortable: false,
      },
      {
        id: 'description',
        header: t('activities.columns.description'),
        accessor: (row) => row.description ?? '',
        cell: (row) => titled(row.description ?? ''),
        sortable: false,
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
        description: t('activities.columnHints.duration'),
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
        sortable: false,
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
        description: t('activities.columnHints.elevationGain'),
        hideBelow: 'lg',
      },
      {
        id: 'averageSpeed',
        header: t('activities.columns.speed'),
        accessor: (row) => row.averageSpeed ?? -1,
        cell: (row) => formatOptionalNumber(format, row.averageSpeed, 1),
        align: 'end',
        unit: t('activities.units.speed'),
        description: t('activities.columnHints.speed'),
        hideBelow: 'lg',
      },
      {
        id: 'tss',
        header: t('activities.columns.tss'),
        description: t('activities.columnHints.tss'),
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
        description: t('activities.columnHints.heartRate'),
        ...secondary,
      },
      {
        id: 'effort',
        header: t('activities.columns.effort'),
        accessor: (row) => row.effort ?? -1,
        cell: (row) => <EffortValue effort={row.effort} />,
        align: 'end',
        unit: t('activities.units.effort'),
        description: t('activities.columnHints.effort'),
        ...secondary,
      },
      {
        id: 'mood',
        header: t('activities.columns.mood'),
        description: t('activities.columnHints.mood'),
        accessor: (row) => moodRank(row.mood),
        cell: (row) => (
          <EmojiValue
            emoji={moodEmoji[row.mood as keyof typeof moodEmoji]}
            label={enumLabel(t, 'moods', row.mood)}
          />
        ),
        ...secondary,
        sortable: false,
      },
      {
        id: 'wind',
        header: t('activities.columns.wind'),
        description: t('activities.columnHints.wind'),
        accessor: (row) => windRank(row.wind),
        cell: (row) => (
          <EmojiValue
            emoji={windEmoji[row.wind as keyof typeof windEmoji]}
            label={enumLabel(t, 'winds', row.wind)}
          />
        ),
        ...secondary,
        hideBelow: filterColumnBreakpoint.wind,
        filter: columnFilters.wind,
        sortable: false,
      },
      {
        id: 'gadgets',
        header: t('activities.columns.gadgets'),
        description: t('activities.columnHints.gadgets'),
        accessor: gadgetNames,
        cell: (row) => titled(gadgetNames(row)),
        ...secondary,
        sortable: false,
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
        sortable: false,
        minWidth: '8rem',
        maxWidth: '14rem',
      },
    ],
    [t, format, columnFilters],
  )

  const changeSort = ({ column, desc }: ListSort) => {
    if (isSortColumn(activitySortColumns, column)) onSortChange({ column, desc })
  }

  return (
    <DataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      sort={sort}
      onSortChange={changeSort}
      caption={t('activities.table.caption')}
      busy={busy}
      emptyMessage={emptyMessage}
      count={t('activities.resultCount', { count: totalCount })}
      countRef={countRef}
      actionsLabel={t('activities.row.actionsColumn')}
      onRowClick={onEdit}
      rowLabel={(row) => t('activities.row.edit', { date: format.date(row.date) })}
      rowActions={(row) => <RowActions row={row} onDuplicate={onDuplicate} onDelete={onDelete} />}
      pagination={{
        hasNextPage,
        isLoadingNext,
        error: loadMoreError,
        onLoadMore,
        loadMoreLabel: t('activities.loadMore'),
        errorLabel: t('activities.loadMoreFailed'),
      }}
    />
  )
})
