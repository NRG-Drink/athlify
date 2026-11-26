import type { ChecklistOption } from '../../components/Checklist'

export const activityTypes = ['ROAD', 'MOUNTAIN', 'GRAVEL', 'INDOOR'] as const
export type ActivityType = (typeof activityTypes)[number]

export const winds = ['CALM', 'LIGHT', 'MODERATE', 'STRONG', 'STORMY'] as const
export type Wind = (typeof winds)[number]

export const moods = ['VERY_BAD', 'BAD', 'NEUTRAL', 'GOOD', 'VERY_GOOD'] as const
export type Mood = (typeof moods)[number]

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
export function asEnum<T extends string>(
  allowed: readonly T[],
  value: string | null | undefined,
): T | undefined {
  return allowed.find((item) => item === value)
}

/** The ids that are allowed enum values, in their order; unknown ones are dropped. */
const enumValues = <T extends string>(allowed: readonly T[], ids: readonly string[]) =>
  ids.map((id) => asEnum(allowed, id)).filter((value): value is T => value !== undefined)

const orUndefined = <T>(list: T[]) => (list.length > 0 ? list : undefined)

export function parseActivityFilters(params: URLSearchParams): ActivityFilters {
  return {
    types: orUndefined(enumValues(activityTypes, readValues(params, 'type'))),
    vehicleIds: orUndefined(readValues(params, 'vehicle')),
    tagIds: orUndefined(readValues(params, 'tag')),
    winds: orUndefined(enumValues(winds, readValues(params, 'wind'))),
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

/** Sets the ticked values of one filter; an empty list turns it off. Unknown enum values are ignored. */
export function setActivityFilterValues(
  filters: ActivityFilters,
  key: ActivityFilterKey,
  ids: readonly string[],
): ActivityFilters {
  switch (key) {
    case 'type':
      return { ...filters, types: orUndefined(enumValues(activityTypes, ids)) }
    case 'vehicle':
      return { ...filters, vehicleIds: orUndefined([...ids]) }
    case 'tag':
      return { ...filters, tagIds: orUndefined([...ids]) }
    case 'wind':
      return { ...filters, winds: orUndefined(enumValues(winds, ids)) }
  }
}

export type FilterOption = ChecklistOption
