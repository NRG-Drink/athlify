import {
  createGridStateCodec,
  type GridFilterModel,
  type GridSavedView,
  type GridSortModel,
} from '../../components/ag-grid/gridStateCodec'
import type { GridColumnState } from '../../components/ag-grid/useGridColumnPreferences'

export const BODY_STATS_COLUMN_STORAGE_KEY = 'athlify.bodystats.columns.v1'
export const BODY_STATS_VIEWS_STORAGE_KEY = 'athlify.bodystats.views.v1'
export const BODY_STATS_FILTER_PREFIX = 'filter.'
export const BODY_STATS_FILTERS_PARAM = 'gridFilters'
export const BODY_STATS_SORT_PARAM = 'gridSort'
export const BODY_STATS_QUICK_PARAM = 'q'
export const BODY_STATS_FROM_PARAM = 'tableFrom'
export const BODY_STATS_TO_PARAM = 'tableTo'

export const bodyStatsColumnIds = [
  'actions',
  'id',
  'date',
  'weight',
  'bodyFatPercentage',
  'musclePercentage',
  'waterPercentage',
  'boneMass',
  'comment',
] as const

const bodyStatsFilterColumnIds = [
  'id',
  'date',
  'weight',
  'bodyFatPercentage',
  'musclePercentage',
  'waterPercentage',
  'boneMass',
  'comment',
] as const

export const bodyStatsSortableColumnIds = bodyStatsFilterColumnIds

export type BodyStatsFilterModel = GridFilterModel
export type BodyStatsSortModel = GridSortModel
export type BodyStatsColumnState = GridColumnState
export type BodyStatsSavedView = GridSavedView<BodyStatsColumnState>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

function coerceNumbers(model: GridFilterModel): GridFilterModel {
  return Object.fromEntries(
    Object.entries(model).map(([column, value]) => {
      if (!isRecord(value)) return [column, value]
      const next = { ...value }
      for (const key of ['filter', 'filterTo']) {
        const raw = next[key]
        if (column !== 'comment' && typeof raw === 'string' && raw.trim() !== '') {
          const number = Number(raw)
          if (Number.isFinite(number)) next[key] = number
        }
      }
      return [column, next]
    }),
  )
}

export const bodyStatsGridStateCodec = createGridStateCodec<BodyStatsColumnState>({
  columnIds: bodyStatsColumnIds,
  filterColumnIds: bodyStatsFilterColumnIds,
  sortableColumnIds: bodyStatsSortableColumnIds,
  filterPrefix: BODY_STATS_FILTER_PREFIX,
  filtersParam: BODY_STATS_FILTERS_PARAM,
  sortParam: BODY_STATS_SORT_PARAM,
  normalizeFilterModel: coerceNumbers,
})

export const parseBodyStatsFilterModel = bodyStatsGridStateCodec.parseFilterModel
export const parseBodyStatsFilterModelValue = bodyStatsGridStateCodec.parseFilterModelValue
export const parseBodyStatsSortModel = bodyStatsGridStateCodec.parseSortModel
export const parseBodyStatsSortModelValue = bodyStatsGridStateCodec.parseSortModelValue
export const applyBodyStatsGridState = bodyStatsGridStateCodec.applyGridState
export const parseBodyStatsColumnState = bodyStatsGridStateCodec.columns.parse
export const parseBodyStatsColumnStateValue = bodyStatsGridStateCodec.columns.parseValue
export const serializeBodyStatsColumnState = bodyStatsGridStateCodec.columns.serialize
export const parseBodyStatsSavedViews = bodyStatsGridStateCodec.parseSavedViews
export const serializeBodyStatsSavedViews = bodyStatsGridStateCodec.serializeSavedViews
