import type { TFunction } from 'i18next'

export const activityTypes = ['ROAD', 'MOUNTAIN', 'GRAVEL', 'INDOOR'] as const
export type ActivityType = (typeof activityTypes)[number]

export const winds = ['CALM', 'LIGHT', 'MODERATE', 'STRONG', 'STORMY'] as const
export type Wind = (typeof winds)[number]

/** Each filter holds the ticked values; an empty or missing list means the filter is off. */
export interface ActivityFilters {
  types?: ActivityType[]
  vehicleIds?: string[]
  tagIds?: string[]
  winds?: Wind[]
}

/** Distinct, non-empty values of a repeated URL parameter. */
function readValues(params: URLSearchParams, key: string): string[] {
  return [...new Set(params.getAll(key).filter(Boolean))]
}

/** The value as one of the allowed enum values, or undefined. */
function asEnum<T extends string>(allowed: readonly T[], value: string): T | undefined {
  return allowed.find((item) => item === value)
}

function readEnum<T extends string>(params: URLSearchParams, key: string, allowed: readonly T[]) {
  return readValues(params, key)
    .map((value) => asEnum(allowed, value))
    .filter((value): value is T => value !== undefined)
}

const orUndefined = <T>(list: T[]) => (list.length > 0 ? list : undefined)

export function parseActivityFilters(params: URLSearchParams): ActivityFilters {
  return {
    types: orUndefined(readEnum(params, 'type', activityTypes)),
    vehicleIds: orUndefined(readValues(params, 'vehicle')),
    tagIds: orUndefined(readValues(params, 'tag')),
    winds: orUndefined(readEnum(params, 'wind', winds)),
  }
}

/** OR within a filter (`in`); the filters are combined with AND by the backend. */
export function activityFiltersToWhere(filters: ActivityFilters) {
  const where: {
    type?: { in: ActivityType[] }
    vehicle?: { id: { in: string[] } }
    tags?: { some: { id: { in: string[] } } }
    wind?: { in: Wind[] }
  } = {}
  if (filters.types) where.type = { in: filters.types }
  if (filters.vehicleIds) where.vehicle = { id: { in: filters.vehicleIds } }
  if (filters.tagIds) where.tags = { some: { id: { in: filters.tagIds } } }
  if (filters.winds) where.wind = { in: filters.winds }
  return Object.keys(where).length > 0 ? where : undefined
}

/** Each filter key, in column order, with the field of ActivityFilters that holds its values. The key is also the URL parameter. */
export const activityFilterFields = {
  type: 'types',
  vehicle: 'vehicleIds',
  tag: 'tagIds',
  wind: 'winds',
} as const satisfies Record<string, keyof ActivityFilters>

export type ActivityFilterKey = keyof typeof activityFilterFields

const activityFilterKeys = Object.keys(activityFilterFields) as ActivityFilterKey[]

export function applyActivityFilters(params: URLSearchParams, filters: ActivityFilters) {
  const next = new URLSearchParams(params)
  for (const key of activityFilterKeys) {
    next.delete(key)
    for (const value of filters[activityFilterFields[key]] ?? []) next.append(key, value)
  }
  return next
}

/** The filter keys that have at least one ticked value, in column order. */
export function activeActivityFilterKeys(filters: ActivityFilters): ActivityFilterKey[] {
  return activityFilterKeys.filter((key) => filterValueCount(key, filters) > 0)
}

/** How many values a filter has ticked. */
export function filterValueCount(key: ActivityFilterKey, filters: ActivityFilters): number {
  return filters[activityFilterFields[key]]?.length ?? 0
}

function toggleValue<T>(list: T[] | undefined, item: T): T[] | undefined {
  const current = list ?? []
  const next = current.includes(item)
    ? current.filter((value) => value !== item)
    : [...current, item]
  return orUndefined(next)
}

/** Adds the value when it is not ticked yet, removes it when it is. Unknown enum values are ignored. */
export function toggleActivityFilter(
  filters: ActivityFilters,
  key: ActivityFilterKey,
  id: string,
): ActivityFilters {
  switch (key) {
    case 'type': {
      const type = asEnum(activityTypes, id)
      return type ? { ...filters, types: toggleValue(filters.types, type) } : filters
    }
    case 'vehicle':
      return { ...filters, vehicleIds: toggleValue(filters.vehicleIds, id) }
    case 'tag':
      return { ...filters, tagIds: toggleValue(filters.tagIds, id) }
    case 'wind': {
      const wind = asEnum(winds, id)
      return wind ? { ...filters, winds: toggleValue(filters.winds, wind) } : filters
    }
  }
}

/** Removes every ticked value of one filter. */
export function clearActivityFilter(
  filters: ActivityFilters,
  key: ActivityFilterKey,
): ActivityFilters {
  return { ...filters, [activityFilterFields[key]]: undefined }
}

/** Breakpoints below which a column is hidden; the filter summary offers its filter there instead. */
export const filterColumnBreakpoint = { vehicle: 'md', tag: '2xl', wind: '2xl' } as const

export interface FilterOption {
  id: string
  label: string
}

function labelsFor(ids: readonly string[] | undefined, options: readonly FilterOption[]) {
  return (ids ?? []).flatMap((id) => {
    const label = options.find((option) => option.id === id)?.label
    return label ? [label] : []
  })
}

/** The labels of the ticked values, in the order they were ticked. Unknown ids are left out. */
export function activeFilterValueLabels(
  key: ActivityFilterKey,
  value: ActivityFilters,
  vehicles: readonly FilterOption[],
  tags: readonly FilterOption[],
  t: TFunction,
): string[] {
  switch (key) {
    case 'type':
      return (value.types ?? []).map((type) => t(`activities.types.${type}`))
    case 'vehicle':
      return labelsFor(value.vehicleIds, vehicles)
    case 'tag':
      return labelsFor(value.tagIds, tags)
    case 'wind':
      return (value.winds ?? []).map((wind) => t(`activities.winds.${wind}`))
  }
}

/**
 * "Road, Gravel" for up to two values, "Road, Gravel +1" for more. When the labels are not loaded
 * yet (or a value is no longer among the first options), the count stands in for them.
 */
export function summarizeValues(labels: readonly string[], count: number, t: TFunction): string {
  if (labels.length === 0) return t('activities.filters.selectedCount', { count })
  if (labels.length <= 2) return labels.join(', ')
  return `${labels.slice(0, 2).join(', ')} ${t('activities.filters.more', { count: labels.length - 2 })}`
}

/** The summary of a filter's ticked values, for the header label and the summary chip. */
export function activeFilterSummary(
  key: ActivityFilterKey,
  filters: ActivityFilters,
  vehicles: readonly FilterOption[],
  tags: readonly FilterOption[],
  t: TFunction,
): string {
  return summarizeValues(
    activeFilterValueLabels(key, filters, vehicles, tags, t),
    filterValueCount(key, filters),
    t,
  )
}
