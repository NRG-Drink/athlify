import type { GridApi, SortModelItem } from 'ag-grid-community'
import { useCallback, useEffect, useRef } from 'react'
import { getGridSortModel, sortModelToColumnState } from './gridSortModel'

interface UseGridUrlSyncOptions<TRow> {
  gridApi: GridApi<TRow> | null
  filterModel: Record<string, unknown>
  sortModel: readonly SortModelItem[]
  /** Counts up whenever the table is reset; zero means never. */
  resetTableVersion: number
  /** Runs after the grid's columns and filters were reset. */
  onReset?: (api: GridApi<TRow>) => void
}

/**
 * Keeps the sort and filter model of a grid in line with the URL-backed state. Changes the hook
 * applies itself are not the user's, so `isApplyingUrlState` lets the change handlers ignore them.
 */
export function useGridUrlSync<TRow>({
  gridApi,
  filterModel,
  sortModel,
  resetTableVersion,
  onReset,
}: UseGridUrlSyncOptions<TRow>) {
  const applying = useRef(false)

  const isApplyingUrlState = useCallback(() => applying.current, [])

  const applyWithoutNotifying = useCallback((apply: () => void) => {
    applying.current = true
    try {
      apply()
    } finally {
      queueMicrotask(() => {
        applying.current = false
      })
    }
  }, [])

  const applyUrlState = useCallback(
    (api: GridApi<TRow>) => {
      const sortChanged = JSON.stringify(getGridSortModel(api)) !== JSON.stringify(sortModel)
      const filtersChanged =
        JSON.stringify(api.getFilterModel() ?? {}) !== JSON.stringify(filterModel)
      if (!sortChanged && !filtersChanged) return

      applyWithoutNotifying(() => {
        if (sortChanged) {
          api.applyColumnState({
            state: sortModelToColumnState(sortModel),
            defaultState: { sort: null },
          })
        }
        if (filtersChanged) {
          api.setFilterModel(Object.keys(filterModel).length > 0 ? filterModel : null)
        }
      })
    },
    [applyWithoutNotifying, filterModel, sortModel],
  )

  useEffect(() => {
    if (gridApi) applyUrlState(gridApi)
  }, [applyUrlState, gridApi])

  useEffect(() => {
    if (!gridApi || resetTableVersion === 0) return
    applyWithoutNotifying(() => {
      gridApi.resetColumnState()
      gridApi.setFilterModel(null)
      onReset?.(gridApi)
    })
  }, [applyWithoutNotifying, gridApi, onReset, resetTableVersion])

  return { applyUrlState, isApplyingUrlState }
}
