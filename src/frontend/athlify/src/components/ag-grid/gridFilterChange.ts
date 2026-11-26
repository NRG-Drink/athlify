import type { GridApi } from 'ag-grid-community'
import { clearNoOpGridFilters } from './GridFilterParams'

/** Clears "no filter" selections first; reports the filter change only when nothing was cleared. */
export function handleGridFilterChanged<TRow>(
  api: GridApi<TRow>,
  onFilterChanged: () => void,
  failureMessage: string,
) {
  void clearNoOpGridFilters(
    api.getFilterModel() ?? {},
    (column) => api.setColumnFilterModel(column, null),
    () => api.onFilterChanged(),
  )
    .then((cleared) => {
      if (!cleared) onFilterChanged()
    })
    .catch((error: unknown) => {
      console.error(failureMessage, error)
    })
}
