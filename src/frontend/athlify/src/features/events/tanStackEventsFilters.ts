import type { ColumnFiltersState } from '@tanstack/react-table'
import { localDateKey } from '../../lib/period'
import { parseDate } from '../../lib/dates'
import { eventTypes, isEventType } from './eventsQuery'

export interface TanStackEventsFilters {
  globalFilter: string
  columnFilters: ColumnFiltersState
}

const globalFilterParam = 'eventsTableSearch'
const textFilterParams = {
  name: 'eventsTableName',
  description: 'eventsTableDescription',
  tags: 'eventsTableTags',
} as const
const typeFilterParam = 'eventsTableType'
const dateFilterParams = {
  startDate: { from: 'eventsTableStartFrom', to: 'eventsTableStartTo' },
  endDate: { from: 'eventsTableEndFrom', to: 'eventsTableEndTo' },
} as const
type TextFilterColumn = keyof typeof textFilterParams

function isTextFilterColumn(columnId: string): columnId is TextFilterColumn {
  return Object.hasOwn(textFilterParams, columnId)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDateKey(value: string | null): string | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = parseDate(`${match[3]}.${match[2]}.${match[1]}`)
  return date && localDateKey(date) === value ? value : undefined
}

export function parseTanStackEventsFilters(params: URLSearchParams): TanStackEventsFilters {
  const columnFilters: ColumnFiltersState = []

  const appendTextFilter = (columnId: TextFilterColumn) => {
    const value = params.get(textFilterParams[columnId])?.trim()
    if (value) columnFilters.push({ id: columnId, value })
  }
  appendTextFilter('name')

  const type = params.get(typeFilterParam)
  if (type && isEventType(type)) columnFilters.push({ id: 'type', value: type })

  for (const [columnId, names] of Object.entries(dateFilterParams)) {
    const from = parseDateKey(params.get(names.from))
    const to = parseDateKey(params.get(names.to))
    if (from && to && from > to) continue
    if (from || to) {
      columnFilters.push({
        id: columnId,
        value: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      })
    }
  }

  appendTextFilter('description')
  appendTextFilter('tags')

  return {
    globalFilter: params.get(globalFilterParam)?.trim() ?? '',
    columnFilters,
  }
}

function isDateRange(value: unknown): value is { from?: string; to?: string } {
  return (
    isRecord(value) &&
    (value.from === undefined || typeof value.from === 'string') &&
    (value.to === undefined || typeof value.to === 'string')
  )
}

export function applyTanStackEventsFilters(
  params: URLSearchParams,
  filters: TanStackEventsFilters,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const ownedParams = [
    globalFilterParam,
    ...Object.values(textFilterParams),
    typeFilterParam,
    ...Object.values(dateFilterParams).flatMap(({ from, to }) => [from, to]),
  ]
  for (const param of ownedParams) next.delete(param)

  const globalFilter = filters.globalFilter.trim()
  if (globalFilter) next.set(globalFilterParam, globalFilter)

  for (const filter of filters.columnFilters) {
    if (isTextFilterColumn(filter.id) && typeof filter.value === 'string') {
      const value = filter.value.trim()
      if (value) next.set(textFilterParams[filter.id], value)
    } else if (filter.id === 'type' && typeof filter.value === 'string') {
      if (eventTypes.some((type) => type === filter.value)) next.set(typeFilterParam, filter.value)
    } else if (
      (filter.id === 'startDate' || filter.id === 'endDate') &&
      isDateRange(filter.value)
    ) {
      const names = dateFilterParams[filter.id]
      const from = parseDateKey(filter.value.from ?? null)
      const to = parseDateKey(filter.value.to ?? null)
      if (from && to && from > to) continue
      if (from) next.set(names.from, from)
      if (to) next.set(names.to, to)
    }
  }

  return next
}
