import type { TFunction } from 'i18next'

export const activityTypes = ['ROAD', 'MOUNTAIN', 'GRAVEL', 'INDOOR'] as const
export type ActivityType = (typeof activityTypes)[number]

export const winds = ['CALM', 'LIGHT', 'MODERATE', 'STRONG', 'STORMY'] as const
export type Wind = (typeof winds)[number]

export interface ActivityFilters {
  type?: ActivityType
  vehicleId?: string
  tagId?: string
  wind?: Wind
}

function parseActivityType(value: string | null): ActivityType | undefined {
  return activityTypes.find((type) => type === value)
}

function parseWind(value: string | null): Wind | undefined {
  return winds.find((wind) => wind === value)
}

export function parseActivityFilters(params: URLSearchParams): ActivityFilters {
  return {
    type: parseActivityType(params.get('type')),
    vehicleId: params.get('vehicle') || undefined,
    tagId: params.get('tag') || undefined,
    wind: parseWind(params.get('wind')),
  }
}

export function activityFiltersToWhere(filters: ActivityFilters) {
  const where: {
    type?: { eq: ActivityType }
    vehicle?: { id: { eq: string } }
    tags?: { some: { id: { eq: string } } }
    wind?: { eq: Wind }
  } = {}
  if (filters.type) where.type = { eq: filters.type }
  if (filters.vehicleId) where.vehicle = { id: { eq: filters.vehicleId } }
  if (filters.tagId) where.tags = { some: { id: { eq: filters.tagId } } }
  if (filters.wind) where.wind = { eq: filters.wind }
  return Object.keys(where).length > 0 ? where : undefined
}

/** Each filter key, in column order, with the field of ActivityFilters that holds its value. The key is also the URL parameter. */
const activityFilterFields = {
  type: 'type',
  vehicle: 'vehicleId',
  tag: 'tagId',
  wind: 'wind',
} as const satisfies Record<string, keyof ActivityFilters>

export type ActivityFilterKey = keyof typeof activityFilterFields

const activityFilterKeys = Object.keys(activityFilterFields) as ActivityFilterKey[]

export function applyActivityFilters(params: URLSearchParams, filters: ActivityFilters) {
  const next = new URLSearchParams(params)
  for (const key of activityFilterKeys) {
    next.delete(key)
    const value = filters[activityFilterFields[key]]
    if (value) next.set(key, value)
  }
  return next
}

/** The filter keys that have a value, in column order. */
export function activeActivityFilterKeys(filters: ActivityFilters): ActivityFilterKey[] {
  return activityFilterKeys.filter((key) => filters[activityFilterFields[key]])
}

/** Sets one filter from its select value; an empty value clears it. */
export function setActivityFilter(
  filters: ActivityFilters,
  key: ActivityFilterKey,
  raw: string,
): ActivityFilters {
  switch (key) {
    case 'type':
      return { ...filters, type: parseActivityType(raw) }
    case 'vehicle':
      return { ...filters, vehicleId: raw || undefined }
    case 'tag':
      return { ...filters, tagId: raw || undefined }
    case 'wind':
      return { ...filters, wind: parseWind(raw) }
  }
}

export function clearActivityFilter(filters: ActivityFilters, key: ActivityFilterKey) {
  return setActivityFilter(filters, key, '')
}

/** Breakpoints below which a column is hidden; the filter summary offers its filter there instead. */
export const filterColumnBreakpoint = { vehicle: 'md', tag: '2xl', wind: '2xl' } as const

export interface FilterOption {
  id: string
  label: string
}

/** The label of the value a filter holds, for the header trigger and the summary chip. */
export function activeFilterValueLabel(
  key: ActivityFilterKey,
  value: ActivityFilters,
  vehicles: readonly FilterOption[],
  tags: readonly FilterOption[],
  t: TFunction,
) {
  switch (key) {
    case 'type':
      return value.type ? t(`activities.types.${value.type}`) : ''
    case 'vehicle':
      return vehicles.find((vehicle) => vehicle.id === value.vehicleId)?.label ?? ''
    case 'tag':
      return tags.find((tag) => tag.id === value.tagId)?.label ?? ''
    case 'wind':
      return value.wind ? t(`activities.winds.${value.wind}`) : ''
  }
}
