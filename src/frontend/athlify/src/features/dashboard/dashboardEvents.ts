import { bucketKey, type Grouping } from '../../lib/aggregate'
import { dateFromKey } from '../../lib/period'
import { eventTypes } from '../events/EventTypes'
import type { TrendMarker } from '../../components/TrendChart'

export type EventType = (typeof eventTypes)[number]

export interface MarkableEvent {
  id: string
  name: string
  type: EventType
  startDate: string
  endDate: string | null
}

/** Setbacks are drawn in the effort colour, goals in the secondary colour, everything else neutral. */
const markerColors: Record<EventType, string> = {
  CRASH: 'var(--chakra-colors-chart-effort)',
  INJURY: 'var(--chakra-colors-chart-effort)',
  ILLNESS: 'var(--chakra-colors-chart-effort)',
  REPAIR: 'var(--chakra-colors-chart-form)',
  BREAK: 'var(--chakra-colors-chart-form)',
  OTHER: 'var(--chakra-colors-chart-form)',
  GOAL: 'var(--chakra-colors-chart-secondary)',
}

/**
 * The events as chart markers on the buckets of the grouping. Events outside the bucket keys
 * (`firstKey`..`lastKey`) are left out; events that reach into the range are cut at its edges.
 */
export function toMarkers(
  events: readonly MarkableEvent[],
  grouping: Grouping,
  firstKey: string,
  lastKey: string,
): TrendMarker[] {
  return events.flatMap((event) => {
    const startKey = bucketKey(dateFromKey(event.startDate), grouping)
    const endKey = bucketKey(dateFromKey(event.endDate ?? event.startDate), grouping)
    if (endKey < firstKey || startKey > lastKey) return []
    return [
      {
        id: event.id,
        name: event.name,
        color: markerColors[event.type],
        startKey: startKey < firstKey ? firstKey : startKey,
        endKey: endKey > lastKey ? lastKey : endKey,
      },
    ]
  })
}
