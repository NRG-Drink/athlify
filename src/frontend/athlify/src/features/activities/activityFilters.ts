import { periodStart, parsePeriod, type Period } from '../../lib/period'

export const activityTypes = ['ROAD', 'MOUNTAIN', 'GRAVEL', 'INDOOR'] as const
export type ActivityType = (typeof activityTypes)[number]

export interface ActivityFilters {
  period: Period
  type?: ActivityType
  vehicleId?: string
  tagId?: string
}

export function parseActivityType(value: string | null): ActivityType | undefined {
  return activityTypes.find((type) => type === value)
}

export function parseActivityFilters(params: URLSearchParams): ActivityFilters {
  return {
    period: parsePeriod(params.get('period'), '90d'),
    type: parseActivityType(params.get('type')),
    vehicleId: params.get('vehicle') || undefined,
    tagId: params.get('tag') || undefined,
  }
}

export function activityFiltersToWhere(filters: ActivityFilters) {
  const where: {
    date?: { gte: string }
    type?: { eq: ActivityType }
    vehicle?: { id: { eq: string } }
    tags?: { some: { id: { eq: string } } }
  } = {}
  const start = periodStart(filters.period, new Date())
  if (start) where.date = { gte: start.toISOString() }
  if (filters.type) where.type = { eq: filters.type }
  if (filters.vehicleId) where.vehicle = { id: { eq: filters.vehicleId } }
  if (filters.tagId) where.tags = { some: { id: { eq: filters.tagId } } }
  return Object.keys(where).length > 0 ? where : undefined
}

export function applyActivityFilters(params: URLSearchParams, filters: ActivityFilters) {
  const next = new URLSearchParams(params)
  next.delete('period')
  next.delete('type')
  next.delete('vehicle')
  next.delete('tag')
  if (filters.period !== '90d') next.set('period', filters.period)
  if (filters.type) next.set('type', filters.type)
  if (filters.vehicleId) next.set('vehicle', filters.vehicleId)
  if (filters.tagId) next.set('tag', filters.tagId)
  return next
}

export function hasActiveActivityFilters(filters: ActivityFilters) {
  return filters.period !== '90d' || Boolean(filters.type || filters.vehicleId || filters.tagId)
}
