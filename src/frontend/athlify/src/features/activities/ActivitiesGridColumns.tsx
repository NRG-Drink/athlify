import { Box, Button, Text } from '@chakra-ui/react'
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community'
import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { LuPin, LuPinOff, LuTrash2 } from 'react-icons/lu'
import {
  createGridDateFilterParams,
  createGridNumberFilterParams,
  createGridTextFilterParams,
} from '../../components/ag-grid/GridFilterParams'
import { ActivityMultiSelectCellEditor } from './ActivityMultiSelectCellEditor'
import { activityTypes, moods, winds, type FilterOption } from './activityFilters'
import type { Formatter } from '../../i18n/useFormat'
import {
  effortLevel,
  enumLabel,
  enumOptions,
  formatDuration,
  formatHeartRate,
  formatOptionalNumber,
  moodEmojiOf,
  vehicleLabel,
  windEmojiOf,
} from './activityFormatting'
import { ActivityGridChecklistFilter } from './ActivityGridChecklistFilter'
import { ActivityEmojiValue, ActivityTagChips } from './ActivityGridCellRenderers'
import type { ActivityRow } from './ActivitiesGridTypes'

type ActivitiesChecklistFilterParams = {
  type: { options: FilterOption[]; label: string }
  vehicle: { options: FilterOption[]; label: string; hasMore: boolean; searchable: boolean }
  tags: { options: FilterOption[]; label: string; hasMore: boolean; searchable: boolean }
  gadgets: { options: FilterOption[]; label: string; hasMore: boolean; searchable: boolean }
  wind: { options: FilterOption[]; label: string }
  mood: { options: FilterOption[]; label: string }
}

type ActivitiesGridColumnOptions = {
  t: TFunction
  format: Formatter
  showMd: boolean
  showLg: boolean
  show2xl: boolean
  isUpdating: boolean
  vehicles: readonly FilterOption[]
  vehicleRecords: readonly NonNullable<ActivityRow['vehicle']>[]
  gadgets: readonly FilterOption[]
  gadgetRecords: readonly ActivityRow['gadgets'][number][]
  tags: readonly FilterOption[]
  tagRecords: readonly ActivityRow['tags'][number][]
  onCreateTag: (name: string, onCreated: (id: string) => void) => void
  isCreatingTag: boolean
  hasMoreVehicles: boolean
  hasMoreGadgets: boolean
  hasMoreTags: boolean
  pinnedActivityIds: ReadonlySet<string>
  onTogglePin: (row: ActivityRow) => void
  onDelete: (row: ActivityRow) => void
}

const gadgetNames = (row: ActivityRow) => row.gadgets.map(vehicleLabel).join(', ')
function selectionOptions<T extends { id: string }>(
  records: readonly T[],
  current: readonly T[],
  labelFor: (record: T) => string,
): FilterOption[] {
  const options = new Map([...records, ...current].map((record) => [record.id, record]))
  return [...options.values()].map((record) => ({ id: record.id, label: labelFor(record) }))
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

export function useActivitiesGridColumns({
  t,
  format,
  showMd,
  showLg,
  show2xl,
  isUpdating,
  vehicles,
  vehicleRecords,
  gadgets,
  gadgetRecords,
  tags,
  tagRecords,
  onCreateTag,
  isCreatingTag,
  hasMoreVehicles,
  hasMoreGadgets,
  hasMoreTags,
  pinnedActivityIds,
  onTogglePin,
  onDelete,
}: ActivitiesGridColumnOptions): ColDef<ActivityRow>[] {
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
  const checklistFilterParams = useMemo<ActivitiesChecklistFilterParams>(
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
        colId: 'actions',
        headerName: t('activities.row.actionsColumn'),
        width: 100,
        minWidth: 100,
        maxWidth: 100,
        pinned: 'left',
        sortable: false,
        filter: false,
        suppressHeaderMenuButton: true,
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) => {
          if (!data) return null
          const pinned = pinnedActivityIds.has(data.id)

          return (
            <Box
              display="grid"
              gridTemplateColumns="max-content max-content"
              alignItems="center"
              justifyContent="center"
              gap="1"
            >
              <Button
                size="xs"
                variant="ghost"
                aria-label={t(pinned ? 'activities.pin.unpin' : 'activities.pin.action')}
                aria-pressed={pinned}
                onClick={() => onTogglePin(data)}
              >
                {pinned ? <LuPinOff aria-hidden /> : <LuPin aria-hidden />}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                aria-label={t('activities.delete.action')}
                onClick={() => onDelete(data)}
              >
                <LuTrash2 aria-hidden />
              </Button>
            </Box>
          )
        },
      },
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
              ? (vehicleRecords.find((option) => option.id === newValue) ?? null)
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
          const nextValue = newValue === '' || newValue == null ? null : Number(newValue)
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
        valueFormatter: ({ value }) => (typeof value === 'number' ? format.number(value, 0) : '—'),
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
        valueFormatter: ({ value }) => (typeof value === 'number' ? format.number(value, 0) : '—'),
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
            <ActivityEmojiValue
              emoji={moodEmojiOf(data.mood)}
              label={enumLabel(t, 'moods', data.mood)}
            />
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
            <ActivityEmojiValue
              emoji={windEmojiOf(data.wind)}
              label={enumLabel(t, 'winds', data.wind)}
            />
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
          onCreateTag,
          isCreatingTag,
        }),
        cellRenderer: ({ data }: ICellRendererParams<ActivityRow>) =>
          data ? <ActivityTagChips row={data} /> : null,
      },
    ]
  }, [
    checklistFilterParams,
    dateFilterParams,
    format,
    gadgetRecords,
    isUpdating,
    numberFilterParams,
    onDelete,
      onTogglePin,
    pinnedActivityIds,
    show2xl,
    showLg,
    showMd,
    textFilterParams,
    t,
    tagRecords,
    onCreateTag,
    isCreatingTag,
    vehicleRecords,
  ])
  return columnDefs
}
