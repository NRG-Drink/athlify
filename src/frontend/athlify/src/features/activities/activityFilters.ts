import type { TFunction } from 'i18next'
import { periodStart, parsePeriod, type Period } from '../../lib/period'

export const activityTypes = ['ROAD', 'MOUNTAIN', 'GRAVEL', 'INDOOR'] as const
export type ActivityType = (typeof activityTypes)[number]

export const winds = ['CALM', 'LIGHT', 'MODERATE', 'STRONG', 'STORMY'] as const
export type Wind = (typeof winds)[number]

export const defaultActivityPeriod: Period = '90d'

export interface ActivityFilters {
  period: Period
  type?: ActivityType
  vehicleId?: string
  tagId?: string
  wind?: Wind
}

export function parseActivityType(value: string | null): ActivityType | undefined {
  return activityTypes.find((type) => type === value)
}

export function parseWind(value: string | null): Wind | undefined {
  return winds.find((wind) => wind === value)
}

export function parseActivityFilters(params: URLSearchParams): ActivityFilters {
  return {
    period: parsePeriod(params.get('period'), defaultActivityPeriod),
    type: parseActivityType(params.get('type')),
    vehicleId: params.get('vehicle') || undefined,
    tagId: params.get('tag') || undefined,
    wind: parseWind(params.get('wind')),
  }
}

export function activityFiltersToWhere(filters: ActivityFilters) {
  const where: {
    date?: { gte: string }
    type?: { eq: ActivityType }
    vehicle?: { id: { eq: string } }
    tags?: { some: { id: { eq: string } } }
    wind?: { eq: Wind }
  } = {}
  const start = periodStart(filters.period, new Date())
  if (start) where.date = { gte: start.toISOString() }
  if (filters.type) where.type = { eq: filters.type }
  if (filters.vehicleId) where.vehicle = { id: { eq: filters.vehicleId } }
  if (filters.tagId) where.tags = { some: { id: { eq: filters.tagId } } }
  if (filters.wind) where.wind = { eq: filters.wind }
  return Object.keys(where).length > 0 ? where : undefined
}

export function applyActivityFilters(params: URLSearchParams, filters: ActivityFilters) {
  const next = new URLSearchParams(params)
  next.delete('period')
  next.delete('type')
  next.delete('vehicle')
  next.delete('tag')
  next.delete('wind')
  if (filters.period !== defaultActivityPeriod) next.set('period', filters.period)
  if (filters.type) next.set('type', filters.type)
  if (filters.vehicleId) next.set('vehicle', filters.vehicleId)
  if (filters.tagId) next.set('tag', filters.tagId)
  if (filters.wind) next.set('wind', filters.wind)
  return next
}

export type ActivityFilterKey = 'period' | 'type' | 'vehicle' | 'tag' | 'wind'

/** The filter keys whose value differs from the default, in column order. */
export function activeActivityFilterKeys(filters: ActivityFilters): ActivityFilterKey[] {
  const keys: ActivityFilterKey[] = []
  if (filters.period !== defaultActivityPeriod) keys.push('period')
  if (filters.type) keys.push('type')
  if (filters.vehicleId) keys.push('vehicle')
  if (filters.tagId) keys.push('tag')
  if (filters.wind) keys.push('wind')
  return keys
}

/** Sets one filter from its select value; an empty value clears it. */
export function setActivityFilter(
  filters: ActivityFilters,
  key: ActivityFilterKey,
  raw: string,
): ActivityFilters {
  switch (key) {
    case 'period':
      return { ...filters, period: (raw || defaultActivityPeriod) as Period }
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
    case 'period':
      return t(`period.long.${value.period}`)
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
