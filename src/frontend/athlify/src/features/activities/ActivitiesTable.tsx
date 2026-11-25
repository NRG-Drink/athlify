import {
  Box,
  Button,
  Flex,
  IconButton,
  Menu,
  Portal,
  Tag,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react'
import type {
  ColDef,
  CellValueChangedEvent,
  GridApi,
  ICellRendererParams,
  ValueGetterParams,
} from 'ag-grid-community'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react'
import { graphql, useFragment } from 'react-relay'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import {
  LuCopy,
  LuEllipsis,
  LuPlus,
  LuPin,
  LuPinOff,
  LuTrash2,
} from 'react-icons/lu'
import { AgGridTable } from '../../components/ag-grid/AgGridTable'
import {
  clearNoOpGridFilters,
  createGridDateFilterParams,
  createGridNumberFilterParams,
  createGridTextFilterParams,
} from '../../components/ag-grid/GridFilterParams'
import { GridColumnPicker } from '../../components/ag-grid/GridColumnPicker'
import { useFormat } from '../../i18n/useFormat'
import { ActivityMultiSelectCellEditor } from './ActivityMultiSelectCellEditor'
import {
  activityTypes,
  moods,
  winds,
  type FilterOption,
} from './activityFilters'
import {
  effortLevel,
  enumLabel,
  formatDuration,
  formatHeartRate,
  formatOptionalNumber,
  moodEmojiOf,
  tagColorPalette,
  vehicleLabel,
  windEmojiOf,
  enumOptions,
} from './activityFormatting'
import {
  type ActivityGridFilterModel,
  type ActivitySort,
} from './activityQuery'
import { ActivityGridChecklistFilter } from './ActivityGridChecklistFilter'
import {
  ACTIVITIES_COLUMN_STORAGE_KEY,
  activitiesColumnIds,
  parseActivitiesColumnState,
  serializeActivitiesColumnState,
  type ActivitiesColumnState,
} from './ActivitiesGridState'
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

export type ActivityRow = Omit<ActivitiesTable_entries$data[number], ' $fragmentType'>

const gadgetNames = (row: ActivityRow) => row.gadgets.map(vehicleLabel).join(', ')
const tagNames = (row: ActivityRow) => row.tags.map((tag) => tag.name).join(', ')

function selectionOptions<T extends { id: string }>(
  records: readonly T[],
  current: readonly T[],
  labelFor: (record: T) => string,
): FilterOption[] {
  const options = new Map([...records, ...current].map((record) => [record.id, record]))
  return [...options.values()].map((record) => ({ id: record.id, label: labelFor(record) }))
}

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
  /** Accessible name of the menu button; it names the row. */
  label: string
  labels: { duplicate: string; delete: string; pin: string; unpin: string }
  pinned: boolean
  onDuplicate: (row: ActivityRow) => void
  onDelete: (row: ActivityRow) => void
  onTogglePin: (row: ActivityRow) => void
}

/**
 * Duplicate and the destructive delete (last) in a menu. It gets its texts as props, so a row adds
 * no hooks of its own.
 */
function RowActions({
  row,
  label,
  labels,
  pinned,
  onDuplicate,
  onDelete,
  onTogglePin,
}: RowActionsProps) {
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        <IconButton variant="ghost" size="sm" color="fg.muted" aria-label={label}>
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
              {labels.duplicate}
            </Menu.Item>
            <Menu.Item value="pin" onClick={() => onTogglePin(row)}>
              {pinned ? <LuPinOff aria-hidden /> : <LuPin aria-hidden />}
              {pinned ? labels.unpin : labels.pin}
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              value="delete"
              color="fg.error"
              _highlighted={{ bg: 'bg.error' }}
              onClick={() => onDelete(row)}
            >
              <LuTrash2 aria-hidden />
              {labels.delete}
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
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
function effortCell(t: TFunction, effort: number | null | undefined) {
  const level = effortLevel(t, effort)
  if (!level) return '—'
  return (
    <Text as="span" title={level.label} whiteSpace="nowrap">
      <span aria-hidden>{level.emoji}</span> {effort}
    </Text>
  )
}

/** Shows the full text as a tooltip, because truncated cells hide the end. */
const titled = (text: string) => (text ? <span title={text}>{text}</span> : '—')

const numericCellStyle = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' } as const

function getGridSortModel(api: GridApi<ActivityRow>): ActivitySort {
  return api
    .getColumnState()
    .filter(({ sort }) => sort)
    .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
    .flatMap(({ colId, sort }) => (sort ? [{ colId, sort }] : []))
}

function ActivityEmptyOverlay({ emptyMessage }: { emptyMessage?: ReactNode }) {
  return <Box p="4">{emptyMessage}</Box>
}

interface ActivitiesTableProps {
  entries: ActivitiesTable_entries$key
  hasNextPage: boolean
  isLoadingNext: boolean
  loadMoreError: boolean
  onLoadMore: () => void
  filterModel: ActivityGridFilterModel
  vehicles: readonly FilterOption[]
  vehicleRecords: readonly NonNullable<ActivityRow['vehicle']>[]
  gadgets: readonly FilterOption[]
  gadgetRecords: readonly ActivityRow['gadgets'][number][]
  tags: readonly FilterOption[]
  tagRecords: readonly ActivityRow['tags'][number][]
  hasMoreVehicles: boolean
  hasMoreGadgets: boolean
  hasMoreTags: boolean
  /** Server-side state; rows arrive filtered and sorted. */
  sort: ActivitySort
  onGridStateChange: (model: ActivityGridFilterModel, sort: ActivitySort) => void
  columnState: ActivitiesColumnState[]
  resetTableVersion: number
  onColumnStateChange: (columns: ActivitiesColumnState[]) => void
  pinnedActivity: ActivityRow | null
  onTogglePin: (row: ActivityRow) => void
  /** Number of activities matching the filters, across all pages. */
  totalCount: number
  /** The data is being refreshed after a filter change. */
  busy: boolean
  /** Shown in the table body when nothing matches; the header and its filters stay. */
  emptyMessage?: ReactNode
  onCreateActivity: () => void
  isCreating: boolean
  isUpdating: boolean
  onCellValueChanged: (event: CellValueChangedEvent<ActivityRow>) => void
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
  filterModel,
  vehicles,
  vehicleRecords,
  gadgets,
  gadgetRecords,
  tags,
  tagRecords,
  hasMoreVehicles,
  hasMoreGadgets,
  hasMoreTags,
  sort,
  onGridStateChange,
  columnState,
  resetTableVersion,
  onColumnStateChange,
  pinnedActivity,
  onTogglePin,
  totalCount,
  busy,
  emptyMessage,
  onCreateActivity,
  isCreating,
  isUpdating,
  onCellValueChanged,
  onDuplicate,
  onDelete,
  countRef,
}: ActivitiesTableProps) {
  const { t, i18n } = useTranslation()
  const format = useFormat()
  const showMd = useBreakpointValue({ base: false, md: true }) ?? true
  const showLg = useBreakpointValue({ base: false, lg: true }) ?? true
  const show2xl = useBreakpointValue({ base: false, '2xl': true }) ?? true
  const [gridApi, setGridApi] = useState<GridApi<ActivityRow> | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...activitiesColumnIds])
  const applyingUrlState = useRef(false)
  const actionLabels = useMemo(
    () => ({
      duplicate: t('activities.duplicate.action'),
      delete: t('activities.delete.action'),
      pin: t('activities.pin.action'),
      unpin: t('activities.pin.unpin'),
    }),
    [t],
  )
  const rows = useFragment(tableFragment, entries)
  const filterOptions = useMemo(
    () => ({
      type: enumOptions(t, 'types', activityTypes),
      vehicle: [...vehicles],
      tags: [...tags],
      gadgets: [...gadgets],
      wind: enumOptions(t, 'winds', winds),
      mood: enumOptions(t, 'moods', moods),
    }),
    [gadgets, t, tags, vehicles],
  )
  const textFilterParams = useMemo(() => createGridTextFilterParams(t, 'activities'), [t])
  const dateFilterParams = useMemo(() => createGridDateFilterParams(t, 'activities'), [t])
  const numberFilterParams = useMemo(() => createGridNumberFilterParams(t, 'activities'), [t])
  const checklistFilterParams = useMemo(
    () => ({
      type: {
        options: filterOptions.type,
        label: t('activities.filters.type'),
      },
      vehicle: {
        options: filterOptions.vehicle,
        label: t('activities.filters.vehicle'),
        hasMore: hasMoreVehicles,
        searchable: true,
      },
      tags: {
        options: filterOptions.tags,
        label: t('activities.filters.tag'),
        hasMore: hasMoreTags,
        searchable: true,
      },
      gadgets: {
        options: filterOptions.gadgets,
        label: t('activities.columnHints.gadgets'),
        hasMore: hasMoreGadgets,
        searchable: true,
      },
      wind: {
        options: filterOptions.wind,
        label: t('activities.filters.wind'),
      },
      mood: {
        options: filterOptions.mood,
        label: t('activities.columns.mood'),
      },
    }),
    [filterOptions, hasMoreGadgets, hasMoreTags, hasMoreVehicles, t],
  )
  const columnDefs = useMemo<ColDef<ActivityRow>[]>(() => {
    return [
      {
        colId: 'date',
        field: 'date',
        headerName: t('activities.columns.date'),
        width: 185,
        minWidth: 170,
        pinned: 'left',
        sortable: true,
        filter: 'agDateColumnFilter',
        filterParams: dateFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { useFormatter: true },
        valueFormatter: ({ value }) => {
          if (typeof value !== 'string') return ''
          const date = new Date(value)
          return Number.isNaN(date.getTime()) ? value : format.dateTime(value)
        },
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? <time dateTime={data.date}>{format.dateTime(data.date)}</time> : null,
      },
      {
        colId: 'type',
        field: 'type',
        headerName: t('activities.columns.type'),
        width: 130,
        minWidth: 120,
        sortable: false,
        editable: !isUpdating,
        filter: ActivityGridChecklistFilter,
        filterParams: checklistFilterParams.type,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: [...activityTypes],
          valueFormatter: ({ value }: { value: string }) =>
            value ? t(`activities.types.${value}`) : '—',
        },
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? t(`activities.types.${data.type}`) : null,
      },
      {
        colId: 'description',
        field: 'description',
        headerName: t('activities.columns.description'),
        width: 240,
        minWidth: 190,
        hide: !showMd,
        sortable: false,
        filter: 'agTextColumnFilter',
        filterParams: textFilterParams,
        editable: !isUpdating,
        cellEditor: 'agLargeStringCellEditor',
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? titled(data.description ?? '') : null,
      },
      {
        colId: 'time',
        field: 'time',
        headerName: `${t('activities.columns.duration')} (${t('activities.units.duration')})`,
        width: 130,
        minWidth: 120,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { useFormatter: true },
        valueFormatter: ({ value }) => (typeof value === 'number' ? formatDuration(value) : '—'),
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.duration'),
      },
      {
        colId: 'distance',
        field: 'distance',
        headerName: `${t('activities.columns.distance')} (${t('activities.units.distance')})`,
        width: 125,
        minWidth: 115,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { useFormatter: true },
        valueFormatter: ({ value }) =>
          typeof value === 'number' ? formatOptionalNumber(format, value, 1) : '—',
        cellStyle: numericCellStyle,
      },
      {
        colId: 'vehicle',
        headerName: t('activities.columns.vehicle'),
        width: 160,
        minWidth: 140,
        hide: !showMd,
        sortable: false,
        filter: ActivityGridChecklistFilter,
        filterParams: checklistFilterParams.vehicle,
        editable: !isUpdating,
        valueGetter: ({ data }) => data?.vehicle?.id ?? '',
        valueSetter: ({ data, newValue }) => {
          if (!data) return false
          const vehicle =
            typeof newValue === 'string'
              ? vehicleRecords.find((option) => option.id === newValue) ?? null
              : null
          if ((data.vehicle?.id ?? '') === (vehicle?.id ?? '')) return false
          Object.assign(data, { vehicle })
          return true
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...vehicleRecords.map(({ id }) => id)],
          valueFormatter: ({ value }: { value: string }) => {
            const vehicle = vehicleRecords.find((option) => option.id === value)
            return vehicle ? vehicleLabel(vehicle) : '—'
          },
        },
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data?.vehicle ? (
            <Text truncate maxW="12rem">
              {vehicleLabel(data.vehicle)}
            </Text>
          ) : (
            '—'
          ),
      },
      {
        colId: 'elevationGain',
        field: 'elevationGain',
        headerName: `${t('activities.columns.elevationGain')} (${t('activities.units.elevation')})`,
        width: 145,
        minWidth: 130,
        hide: !showLg,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { useFormatter: true },
        valueFormatter: ({ value }) =>
          typeof value === 'number' ? formatOptionalNumber(format, value, 0) : '—',
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.elevationGain'),
      },
      {
        colId: 'averageSpeed',
        field: 'averageSpeed',
        headerName: `${t('activities.columns.speed')} (${t('activities.units.speed')})`,
        width: 155,
        minWidth: 140,
        hide: !showLg,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        valueFormatter: ({ value }) =>
          typeof value === 'number' ? formatOptionalNumber(format, value, 1) : '—',
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.speed'),
      },
      {
        colId: 'tss',
        field: 'tss',
        headerName: t('activities.columns.tss'),
        width: 100,
        minWidth: 90,
        hide: !showLg,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        valueFormatter: ({ value }) => (typeof value === 'number' ? format.number(value, 0) : '—'),
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.tss'),
      },
      {
        colId: 'heartRate',
        headerName: `${t('activities.columns.heartRate')} (${t('activities.units.heartRate')})`,
        width: 150,
        minWidth: 140,
        hide: !show2xl,
        valueGetter: ({ data }: ValueGetterParams<ActivityRow>) => data?.heartRateAverage,
        valueSetter: ({ data, newValue }) => {
          if (!data) return false
          const nextValue =
            newValue === '' || newValue == null ? null : Number(newValue)
          if (data.heartRateAverage === nextValue) return false
          Object.assign(data, { heartRateAverage: nextValue })
          return true
        },
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { useFormatter: true },
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) => {
          if (!data) return null
          const { text, title } = formatHeartRate(
            data.heartRateAverage,
            data.heartRateMin,
            data.heartRateMax,
          )
          return title ? <span title={title}>{text}</span> : text
        },
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.heartRate'),
      },
      {
        colId: 'heartRateMin',
        field: 'heartRateMin',
        headerName: `${t('activities.columns.heartRateMin')} (${t('activities.units.heartRate')})`,
        width: 140,
        minWidth: 130,
        hide: true,
        sortable: false,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        valueFormatter: ({ value }) =>
          typeof value === 'number' ? format.number(value, 0) : '—',
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.heartRate'),
      },
      {
        colId: 'heartRateMax',
        field: 'heartRateMax',
        headerName: `${t('activities.columns.heartRateMax')} (${t('activities.units.heartRate')})`,
        width: 140,
        minWidth: 130,
        hide: true,
        sortable: false,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        valueFormatter: ({ value }) =>
          typeof value === 'number' ? format.number(value, 0) : '—',
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.heartRate'),
      },
      {
        colId: 'effort',
        field: 'effort',
        headerName: `${t('activities.columns.effort')} (${t('activities.units.effort')})`,
        width: 145,
        minWidth: 130,
        hide: !show2xl,
        sortable: true,
        filter: 'agNumberColumnFilter',
        filterParams: numberFilterParams,
        editable: !isUpdating,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: { useFormatter: true },
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? effortCell(t, data.effort) : null,
        cellStyle: numericCellStyle,
        headerTooltip: t('activities.columnHints.effort'),
      },
      {
        colId: 'mood',
        field: 'mood',
        headerName: t('activities.columns.mood'),
        width: 110,
        minWidth: 100,
        hide: !show2xl,
        sortable: false,
        editable: !isUpdating,
        filter: ActivityGridChecklistFilter,
        filterParams: checklistFilterParams.mood,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...moods],
          valueFormatter: ({ value }: { value: string }) =>
            value ? enumLabel(t, 'moods', value) : '—',
        },
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? (
            <EmojiValue emoji={moodEmojiOf(data.mood)} label={enumLabel(t, 'moods', data.mood)} />
          ) : null,
        headerTooltip: t('activities.columnHints.mood'),
      },
      {
        colId: 'wind',
        field: 'wind',
        headerName: t('activities.columns.wind'),
        width: 110,
        minWidth: 100,
        hide: !show2xl,
        sortable: false,
        editable: !isUpdating,
        filter: ActivityGridChecklistFilter,
        filterParams: checklistFilterParams.wind,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...winds],
          valueFormatter: ({ value }: { value: string }) =>
            value ? enumLabel(t, 'winds', value) : '—',
        },
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? (
            <EmojiValue emoji={windEmojiOf(data.wind)} label={enumLabel(t, 'winds', data.wind)} />
          ) : null,
        headerTooltip: t('activities.columnHints.wind'),
      },
      {
        colId: 'gadgets',
        headerName: t('activities.columns.gadgets'),
        width: 170,
        minWidth: 140,
        hide: !show2xl,
        sortable: false,
        filter: ActivityGridChecklistFilter,
        filterParams: checklistFilterParams.gadgets,
        editable: !isUpdating,
        valueGetter: ({ data }) => data?.gadgets.map(({ id }) => id) ?? [],
        valueSetter: ({ data, newValue }) => {
          if (!data || !Array.isArray(newValue)) return false
          const records = new Map(
            [...gadgetRecords, ...data.gadgets].map((gadget) => [gadget.id, gadget]),
          )
          const ids = newValue.filter((id): id is string => typeof id === 'string')
          const next = ids.flatMap((id) => {
            const gadget = records.get(id)
            return gadget ? [gadget] : []
          })
          if (JSON.stringify(data.gadgets.map(({ id }) => id)) === JSON.stringify(ids)) return false
          Object.assign(data, { gadgets: next })
          return true
        },
        cellEditor: ActivityMultiSelectCellEditor,
        cellEditorPopup: true,
        cellEditorParams: ({ data }: { data?: ActivityRow }) => ({
          options: selectionOptions(gadgetRecords, data?.gadgets ?? [], vehicleLabel),
          label: t('activities.columns.gadgets'),
        }),
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? titled(gadgetNames(data)) : null,
        headerTooltip: t('activities.columnHints.gadgets'),
      },
      {
        colId: 'tags',
        headerName: t('activities.columns.tags'),
        width: 170,
        minWidth: 140,
        hide: !show2xl,
        valueGetter: ({ data }) => data?.tags.map(({ id }) => id) ?? [],
        sortable: false,
        filter: ActivityGridChecklistFilter,
        filterParams: checklistFilterParams.tags,
        editable: !isUpdating,
        valueSetter: ({ data, newValue }) => {
          if (!data || !Array.isArray(newValue)) return false
          const records = new Map([...tagRecords, ...data.tags].map((tag) => [tag.id, tag]))
          const ids = newValue.filter((id): id is string => typeof id === 'string')
          const next = ids.flatMap((id) => {
            const tag = records.get(id)
            return tag ? [tag] : []
          })
          if (JSON.stringify(data.tags.map(({ id }) => id)) === JSON.stringify(ids)) return false
          Object.assign(data, { tags: next })
          return true
        },
        cellEditor: ActivityMultiSelectCellEditor,
        cellEditorPopup: true,
        cellEditorParams: ({ data }: { data?: ActivityRow }) => ({
          options: selectionOptions(tagRecords, data?.tags ?? [], ({ name }) => name),
          label: t('activities.columns.tags'),
        }),
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? <TagChips row={data} /> : null,
      },
      {
        colId: 'actions',
        headerName: t('activities.row.actionsColumn'),
        width: 70,
        minWidth: 70,
        maxWidth: 70,
        pinned: 'right',
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? (
            <RowActions
              row={data}
              label={t('activities.row.more', { date: format.date(data.date) })}
              labels={actionLabels}
              pinned={pinnedActivity?.id === data.id}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
            />
          ) : null,
      },
    ]
  }, [
    actionLabels,
    checklistFilterParams,
    dateFilterParams,
    format,
    gadgetRecords,
    isUpdating,
    numberFilterParams,
    onDelete,
    onDuplicate,
    onTogglePin,
    pinnedActivity,
    show2xl,
    showLg,
    showMd,
    textFilterParams,
    t,
    tagRecords,
    vehicleRecords,
  ])

  const updateColumnState = useCallback(
    (api: GridApi<ActivityRow>) => {
      const state = parseActivitiesColumnState(
        serializeActivitiesColumnState(api.getColumnState()),
      )
      onColumnStateChange(state)
      setVisibleColumns(state.filter(({ hide }) => !hide).map(({ colId }) => colId))
    },
    [onColumnStateChange],
  )

  const persistColumnState = useCallback(
    (api: GridApi<ActivityRow>) => {
      const state = serializeActivitiesColumnState(api.getColumnState())
      updateColumnState(api)
      try {
        window.localStorage.setItem(ACTIVITIES_COLUMN_STORAGE_KEY, state)
      } catch (error) {
        console.error('Could not save Activities column preferences.', error)
      }
    },
    [updateColumnState],
  )

  const restoreColumnState = useCallback(
    (api: GridApi<ActivityRow>) => {
      try {
        const stored = parseActivitiesColumnState(
          window.localStorage.getItem(ACTIVITIES_COLUMN_STORAGE_KEY),
        )
        if (stored.length > 0) api.applyColumnState({ state: stored, applyOrder: true })
      } catch (error) {
        console.error('Could not restore Activities column preferences.', error)
      }
      updateColumnState(api)
    },
    [updateColumnState],
  )

  useEffect(() => {
    if (!gridApi || columnState.length === 0) return
    const current = serializeActivitiesColumnState(gridApi.getColumnState())
    const desired = serializeActivitiesColumnState(columnState)
    if (current !== desired) gridApi.applyColumnState({ state: columnState, applyOrder: true })
  }, [columnState, gridApi])

  useEffect(() => {
    if (!gridApi || resetTableVersion === 0) return
    gridApi.resetColumnState()
    applyingUrlState.current = true
    gridApi.setFilterModel(null)
    queueMicrotask(() => {
      applyingUrlState.current = false
    })
  }, [gridApi, resetTableVersion])

  useEffect(() => {
    if (!gridApi) return
    const current = getGridSortModel(gridApi)
    if (JSON.stringify(current) === JSON.stringify(sort)) return
    applyingUrlState.current = true
    gridApi.applyColumnState({
      state: sort.map(({ colId, sort: direction }, sortIndex) => ({
        colId,
        sort: direction,
        sortIndex,
      })),
      defaultState: { sort: null },
    })
    queueMicrotask(() => {
      applyingUrlState.current = false
    })
  }, [gridApi, sort])

  useEffect(() => {
    if (!gridApi) return
    const current = JSON.stringify(gridApi.getFilterModel() ?? {})
    const desired = JSON.stringify(filterModel)
    if (current === desired) return
    applyingUrlState.current = true
    gridApi.setFilterModel(Object.keys(filterModel).length > 0 ? filterModel : null)
    queueMicrotask(() => {
      applyingUrlState.current = false
    })
  }, [filterModel, gridApi])

  return (
    <Flex direction="column" gap="3">
      <Box
        display="grid"
        gridTemplateColumns={{ base: '1fr', sm: '1fr auto' }}
        alignItems="center"
        gap="3"
      >
        <Text
          ref={countRef}
          tabIndex={countRef ? -1 : undefined}
          fontSize="sm"
          color="fg.muted"
          aria-live="polite"
          _focusVisible={{ outline: 'none' }}
        >
          {t('activities.resultCount', { count: totalCount })}
        </Text>
        <Box
          display="grid"
          gridTemplateColumns="max-content max-content"
          justifyContent={{ base: 'start', sm: 'end' }}
          gap="2"
        >
          <Button size="sm" onClick={onCreateActivity} loading={isCreating}>
            <LuPlus aria-hidden />
            {t('activities.add.open')}
          </Button>
          <GridColumnPicker
            visibleColumns={visibleColumns}
            columns={activitiesColumnIds
              .filter((id) => id !== 'actions')
              .map((id) => ({
                id,
                label: t(
                  `activities.columns.${({
                    time: 'duration',
                    averageSpeed: 'speed',
                  } as Record<string, string>)[id] ?? id}`,
                ),
              }))}
            openLabel={t('activities.columnPicker.open')}
            dialogLabel={t('activities.columnPicker.label')}
            onColumnVisibleChange={(column, visible) => {
              gridApi?.applyColumnState({ state: [{ colId: column, hide: !visible }] })
              if (gridApi) persistColumnState(gridApi)
            }}
          />
        </Box>
      </Box>
      <AgGridTable<ActivityRow>
        key={i18n.resolvedLanguage}
        ariaLabel={t('activities.table.caption')}
        height="clamp(24rem, calc(100dvh - 22rem), 48rem)"
        busy={busy}
        rowData={rows
          .filter((row) => row.id !== pinnedActivity?.id)
          .map((row) => ({ ...row }))}
        columnDefs={columnDefs}
        headerHeight={48}
        defaultColDef={{
          resizable: true,
          sortable: true,
          filter: true,
          suppressHeaderMenuButton: false,
          minWidth: 100,
        }}
        getRowId={({ data }) => data?.id ?? ''}
        pinnedTopRowData={pinnedActivity ? [{ ...pinnedActivity }] : undefined}
        noRowsOverlayComponent={ActivityEmptyOverlay}
        noRowsOverlayComponentParams={{ emptyMessage }}
        localeText={{
          noRowsToShow: t('activities.empty.filteredTitle'),
          equals: t('activities.gridFilter.options.equals'),
          notEqual: t('activities.gridFilter.options.notEqual'),
          contains: t('activities.gridFilter.options.contains'),
          notContains: t('activities.gridFilter.options.notContains'),
          startsWith: t('activities.gridFilter.options.startsWith'),
          endsWith: t('activities.gridFilter.options.endsWith'),
          blank: t('activities.gridFilter.options.blank'),
          notBlank: t('activities.gridFilter.options.notBlank'),
          lessThan: t('activities.gridFilter.options.lessThan'),
          greaterThan: t('activities.gridFilter.options.greaterThan'),
          inRange: t('activities.gridFilter.options.inRange'),
          before: t('activities.gridFilter.options.before'),
          after: t('activities.gridFilter.options.after'),
        }}
        onGridReady={({ api }) => {
          setGridApi(api)
          restoreColumnState(api)
          applyingUrlState.current = true
          api.applyColumnState({
            state: sort.map(({ colId, sort: direction }, sortIndex) => ({
              colId,
              sort: direction,
              sortIndex,
            })),
            defaultState: { sort: null },
          })
          api.setFilterModel(Object.keys(filterModel).length > 0 ? filterModel : null)
          queueMicrotask(() => {
            applyingUrlState.current = false
          })
        }}
        onFilterChanged={({ api }) => {
          void clearNoOpGridFilters(
            api.getFilterModel() ?? {},
            (column) => api.setColumnFilterModel(column, null),
            () => api.onFilterChanged(),
          )
            .then((cleared) => {
              if (!cleared && !applyingUrlState.current) {
                onGridStateChange(api.getFilterModel() ?? {}, getGridSortModel(api))
              }
            })
            .catch((error: unknown) => {
              console.error('Could not clear no-op activity filters.', error)
            })
        }}
        onSortChanged={({ api }) => {
          if (!applyingUrlState.current) {
            onGridStateChange(
              { ...filterModel, ...(api.getFilterModel() ?? {}) },
              getGridSortModel(api),
            )
          }
        }}
        onCellValueChanged={onCellValueChanged}
        onBodyScrollEnd={({ api }) => {
          if (
            hasNextPage &&
            !isLoadingNext &&
            api.getDisplayedRowCount() > 0 &&
            api.getLastDisplayedRowIndex() >= api.getDisplayedRowCount() - 1
          ) {
            onLoadMore()
          }
        }}
        onColumnMoved={({ api }) => persistColumnState(api)}
        onColumnVisible={({ api }) => persistColumnState(api)}
        onColumnResized={({ api, finished }) => {
          if (finished) persistColumnState(api)
        }}
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
      {isLoadingNext && (
        <Text aria-live="polite" color="fg.muted" textAlign="center">
          {t('activities.loadingMore')}
        </Text>
      )}
    </Flex>
  )
})
