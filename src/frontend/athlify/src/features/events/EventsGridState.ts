import {
  createGridStateCodec,
  type GridFilterModel,
  type GridSavedView,
  type GridSortModel,
} from '../../components/ag-grid/gridStateCodec'
import type { GridColumnState } from '../../components/ag-grid/useGridColumnPreferences'

export const EVENTS_COLUMN_STORAGE_KEY = 'athlify.events.columns.v1'
export const EVENTS_VIEWS_STORAGE_KEY = 'athlify.events.views.v1'
export const EVENTS_FILTER_PREFIX = 'filter.'
export const EVENTS_FILTERS_PARAM = 'gridFilters'
export const EVENTS_SORT_PARAM = 'gridSort'

export const eventsColumnIds = [
  'delete',
  'id',
  'name',
  'startDate',
  'endDate',
  'type',
  'tags',
  'description',
] as const

export type EventsFilterModel = GridFilterModel
export type EventsSortModel = GridSortModel
export type EventsColumnState = GridColumnState
export type EventsSavedView = GridSavedView<EventsColumnState>

export const eventsGridStateCodec = createGridStateCodec<EventsColumnState>({
  columnIds: eventsColumnIds,
  filterColumnIds: ['name', 'startDate', 'endDate', 'type', 'tags', 'description'],
  sortableColumnIds: ['id', 'name', 'startDate', 'endDate', 'type', 'description'],
  filterPrefix: EVENTS_FILTER_PREFIX,
  filtersParam: EVENTS_FILTERS_PARAM,
  sortParam: EVENTS_SORT_PARAM,
  listLeaves: ['values'],
})

export const parseEventsFilterModel = eventsGridStateCodec.parseFilterModel
export const parseEventsFilterModelValue = eventsGridStateCodec.parseFilterModelValue
export const parseEventsSortModel = eventsGridStateCodec.parseSortModel
export const parseEventsSortModelValue = eventsGridStateCodec.parseSortModelValue
export const applyEventsGridState = eventsGridStateCodec.applyGridState
export const parseEventsColumnState = eventsGridStateCodec.columns.parse
export const parseEventsColumnStateValue = eventsGridStateCodec.columns.parseValue
export const serializeEventsColumnState = eventsGridStateCodec.columns.serialize
export const parseEventsSavedViews = eventsGridStateCodec.parseSavedViews
export const serializeEventsSavedViews = eventsGridStateCodec.serializeSavedViews
