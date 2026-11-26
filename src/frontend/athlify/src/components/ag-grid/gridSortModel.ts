import type { GridApi, SortModelItem } from 'ag-grid-community'

export function getGridSortModel<TRow>(api: GridApi<TRow>): SortModelItem[] {
  return api
    .getColumnState()
    .filter(({ sort }) => sort)
    .sort((left, right) => (left.sortIndex ?? 0) - (right.sortIndex ?? 0))
    .flatMap(({ colId, sort }) => (sort ? [{ colId, sort }] : []))
}

export function sortModelToColumnState(sortModel: readonly SortModelItem[]) {
  return sortModel.map(({ colId, sort }, sortIndex) => ({ colId, sort, sortIndex }))
}
