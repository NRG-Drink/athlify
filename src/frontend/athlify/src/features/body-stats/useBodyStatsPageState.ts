import {
  useGridPageState,
  type GridPageFilterControls,
  type GridPageStateConfig,
  type GridSavedViewControls,
} from '../../components/ag-grid/useGridPageState'
import type { BodyStatsFilterInput } from './__generated__/BodyStatsGridPageQuery.graphql'
import { dayEndIso, dayStartIso } from './BodyStatsGridQuery'
import {
  BODY_STATS_COLUMN_STORAGE_KEY,
  BODY_STATS_FROM_PARAM,
  BODY_STATS_QUICK_PARAM,
  BODY_STATS_TO_PARAM,
  BODY_STATS_VIEWS_STORAGE_KEY,
  bodyStatsGridStateCodec,
  type BodyStatsColumnState,
} from './BodyStatsGridState'

export type BodyStatsPageFilterControls = GridPageFilterControls
export type BodyStatsSavedViewControls = GridSavedViewControls<BodyStatsColumnState>

function buildBodyStatsWhere({
  from,
  to,
  term,
}: {
  from: string
  to: string
  term: string
}): BodyStatsFilterInput | null {
  const clauses: BodyStatsFilterInput[] = []
  const start = from ? dayStartIso(from) : null
  const end = to ? dayEndIso(to) : null
  if (start) clauses.push({ date: { gte: start } })
  if (end) clauses.push({ date: { lte: end } })
  if (term) clauses.push({ comment: { contains: term } })
  return clauses.length === 0 ? null : clauses.length === 1 ? clauses[0]! : { and: clauses }
}

const config: GridPageStateConfig<BodyStatsColumnState, BodyStatsFilterInput> = {
  codec: bodyStatsGridStateCodec,
  urlParams: {
    quick: BODY_STATS_QUICK_PARAM,
    from: BODY_STATS_FROM_PARAM,
    to: BODY_STATS_TO_PARAM,
  },
  columnStorageKey: BODY_STATS_COLUMN_STORAGE_KEY,
  viewsStorageKey: BODY_STATS_VIEWS_STORAGE_KEY,
  storageLabel: 'Body-Stats',
  buildWhere: buildBodyStatsWhere,
  selectViewByColumns: true,
}

export function useBodyStatsPageState() {
  return useGridPageState(config)
}
