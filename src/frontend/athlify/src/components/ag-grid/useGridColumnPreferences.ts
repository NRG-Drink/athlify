import type { ColumnState, GridApi } from 'ag-grid-community'
import { useCallback, useEffect, useState } from 'react'

export type GridColumnState = Pick<ColumnState, 'colId' | 'width' | 'hide' | 'pinned'>

interface UseGridColumnPreferencesOptions<TRow, TState extends GridColumnState> {
  gridApi: GridApi<TRow> | null
  columnIds: readonly string[]
  storageKey: string
  /** Names the grid in the console message when the browser storage fails. */
  storageLabel: string
  /** The column state the page wants the grid to show, for example from a saved view. */
  columnState: TState[]
  parse: (raw: string | null) => TState[]
  serialize: (state: TState[]) => string
  onColumnStateChange: (columns: TState[]) => void
}

/** Restores, persists and reports the column order, width and visibility of a grid. */
export function useGridColumnPreferences<TRow, TState extends GridColumnState>({
  gridApi,
  columnIds,
  storageKey,
  storageLabel,
  columnState,
  parse,
  serialize,
  onColumnStateChange,
}: UseGridColumnPreferencesOptions<TRow, TState>) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([...columnIds])

  const reportColumnState = useCallback(
    (api: GridApi<TRow>) => {
      const state = parse(serialize(api.getColumnState() as TState[]))
      onColumnStateChange(state)
      setVisibleColumns(state.filter(({ hide }) => !hide).map(({ colId }) => colId))
    },
    [onColumnStateChange, parse, serialize],
  )

  const persistColumnState = useCallback(
    (api: GridApi<TRow>) => {
      const state = serialize(api.getColumnState() as TState[])
      reportColumnState(api)
      try {
        window.localStorage.setItem(storageKey, state)
      } catch (error) {
        console.error(`Could not save ${storageLabel} column preferences.`, error)
      }
    },
    [reportColumnState, serialize, storageKey, storageLabel],
  )

  const restoreColumnState = useCallback(
    (api: GridApi<TRow>) => {
      try {
        const stored = parse(window.localStorage.getItem(storageKey))
        if (stored.length > 0) api.applyColumnState({ state: stored, applyOrder: true })
      } catch (error) {
        console.error(`Could not restore ${storageLabel} column preferences.`, error)
      }
      reportColumnState(api)
    },
    [parse, reportColumnState, storageKey, storageLabel],
  )

  const setColumnVisible = useCallback(
    (column: string, visible: boolean) => {
      if (!gridApi) return
      gridApi.applyColumnState({ state: [{ colId: column, hide: !visible }] })
      persistColumnState(gridApi)
    },
    [gridApi, persistColumnState],
  )

  useEffect(() => {
    if (!gridApi || columnState.length === 0) return
    if (serialize(gridApi.getColumnState() as TState[]) !== serialize(columnState)) {
      gridApi.applyColumnState({ state: columnState, applyOrder: true })
    }
  }, [columnState, gridApi, serialize])

  return { visibleColumns, persistColumnState, restoreColumnState, setColumnVisible }
}
