import {
  useGridPageState,
  type GridPageFilterControls,
  type GridPageStateConfig,
  type GridSavedViewControls,
} from '../../components/ag-grid/useGridPageState'
import type { EventFilterInput } from './__generated__/EventsManagementPageQuery.graphql'
import {
  EVENTS_COLUMN_STORAGE_KEY,
  EVENTS_VIEWS_STORAGE_KEY,
  eventsGridStateCodec,
  type EventsColumnState,
} from './EventsGridState'

export type EventsPageFilterControls = GridPageFilterControls
export type EventsSavedViewControls = GridSavedViewControls<EventsColumnState>

export function toGraphQLDate(dateString: string): string | undefined {
  if (!dateString) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString

  const date = new Date(dateString)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

function buildEventsWhere({
  from,
  to,
  term,
}: {
  from: string
  to: string
  term: string
}): EventFilterInput | null {
  const clauses: EventFilterInput[] = []
  if (from) clauses.push({ startDate: { gte: toGraphQLDate(from) } })
  if (to) clauses.push({ endDate: { lte: toGraphQLDate(to) } })
  if (term)
    clauses.push({ or: [{ name: { contains: term } }, { description: { contains: term } }] })
  return clauses.length === 0 ? null : clauses.length === 1 ? clauses[0]! : { and: clauses }
}

const config: GridPageStateConfig<EventsColumnState, EventFilterInput> = {
  codec: eventsGridStateCodec,
  urlParams: { quick: 'q', from: 'from', to: 'to' },
  columnStorageKey: EVENTS_COLUMN_STORAGE_KEY,
  viewsStorageKey: EVENTS_VIEWS_STORAGE_KEY,
  storageLabel: 'My Events',
  buildWhere: buildEventsWhere,
  selectViewByColumns: false,
}

export function useEventsPageState() {
  return useGridPageState(config)
}
