import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { GridSavedView, GridStateCodec } from './gridStateCodec'
import type { GridColumnState } from './useGridColumnPreferences'

export type GridPageFilterControls = {
  quickFilter: string
  fromFilter: string
  toFilter: string
  onQuickFilterChange: (value: string) => void
  onFromFilterChange: (value: string) => void
  onToFilterChange: (value: string) => void
  onFilterYearToDate: () => void
  onResetFilters: () => void
  onResetTable: () => void
}

export type GridSavedViewControls<TColumnState extends GridColumnState = GridColumnState> = {
  items: GridSavedView<TColumnState>[]
  selectedId: string
  storageFailed: boolean
  canSave: boolean
  onApply: (id: string) => void
  onSave: (name: string) => void
  onDelete: () => void
}

export interface GridPageStateConfig<TColumnState extends GridColumnState, TWhere> {
  codec: GridStateCodec<TColumnState>
  /** Names of the URL parameters of the quick filter and the date range. */
  urlParams: { quick: string; from: string; to: string }
  columnStorageKey: string
  viewsStorageKey: string
  /** Names the grid in the console message when the browser storage fails. */
  storageLabel: string
  buildWhere: (filters: { from: string; to: string; term: string }) => TWhere | null
  /** Whether a saved view is only selected when its columns match the shown columns too. */
  selectViewByColumns: boolean
}

const quickFilterDelayMs = 250

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

function setOrDelete(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value)
  else params.delete(key)
}

/**
 * The URL-backed state of a grid page: quick filter, date range, grid filters and sort, the column
 * layout the page wants and the saved views kept in the browser. `config` must not change.
 */
export function useGridPageState<TColumnState extends GridColumnState, TWhere>(
  config: GridPageStateConfig<TColumnState, TWhere>,
) {
  const { codec, urlParams, columnStorageKey, viewsStorageKey, storageLabel, buildWhere } = config
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuickFilter = searchParams.get(urlParams.quick) ?? ''
  const [quickFilterDraft, setQuickFilterDraft] = useState<{
    value: string
    basedOn: string
  } | null>(null)
  const quickFilter =
    quickFilterDraft?.basedOn === urlQuickFilter ? quickFilterDraft.value : urlQuickFilter
  const fromFilter = searchParams.get(urlParams.from) ?? ''
  const toFilter = searchParams.get(urlParams.to) ?? ''
  const filterModel = useMemo(() => codec.parseFilterModel(searchParams), [codec, searchParams])
  const sortModel = useMemo(() => codec.parseSortModel(searchParams), [codec, searchParams])
  const [columnState, setColumnState] = useState<TColumnState[]>([])
  const [resetTableVersion, setResetTableVersion] = useState(0)
  const [viewStore, setViewStore] = useState(() => {
    try {
      return {
        views: codec.parseSavedViews(window.localStorage.getItem(viewsStorageKey)),
        failed: false,
      }
    } catch (error) {
      console.error(`Could not restore ${storageLabel} saved views.`, error)
      return { views: [] as GridSavedView<TColumnState>[], failed: true }
    }
  })

  const updateSearchParams = useCallback(
    (update: (params: URLSearchParams) => URLSearchParams) => {
      setSearchParams((current) => update(new URLSearchParams(current)), { replace: true })
    },
    [setSearchParams],
  )

  const where = useMemo(
    () => buildWhere({ from: fromFilter, to: toFilter, term: urlQuickFilter.trim() }),
    [buildWhere, fromFilter, toFilter, urlQuickFilter],
  )

  const persistSavedViews = useCallback(
    (views: GridSavedView<TColumnState>[]) => {
      try {
        window.localStorage.setItem(viewsStorageKey, codec.serializeSavedViews(views))
        setViewStore({ views, failed: false })
      } catch (error) {
        console.error(`Could not save ${storageLabel} saved views.`, error)
        setViewStore((current) => ({ ...current, failed: true }))
      }
    },
    [codec, storageLabel, viewsStorageKey],
  )

  const selectedSavedViewId =
    viewStore.views.find(
      (view) =>
        view.filters.quick === quickFilter &&
        view.filters.from === fromFilter &&
        view.filters.to === toFilter &&
        stableStringify(view.filters.grid) === stableStringify(filterModel) &&
        stableStringify(view.sort) === stableStringify(sortModel) &&
        (!config.selectViewByColumns ||
          codec.columns.serialize(view.columns) === codec.columns.serialize(columnState)),
    )?.id ?? ''

  const onQuickFilterChange = useCallback(
    (value: string) => setQuickFilterDraft({ value, basedOn: urlQuickFilter }),
    [urlQuickFilter],
  )

  const onFromFilterChange = useCallback(
    (value: string) =>
      updateSearchParams((params) => {
        setOrDelete(params, urlParams.from, value)
        return params
      }),
    [updateSearchParams, urlParams.from],
  )

  const onToFilterChange = useCallback(
    (value: string) =>
      updateSearchParams((params) => {
        setOrDelete(params, urlParams.to, value)
        return params
      }),
    [updateSearchParams, urlParams.to],
  )

  const onFilterYearToDate = useCallback(() => {
    const now = new Date()
    updateSearchParams((params) => {
      params.set(urlParams.from, `${now.getFullYear()}-01-01`)
      params.delete(urlParams.to)
      return params
    })
  }, [updateSearchParams, urlParams.from, urlParams.to])

  const clearFilterParams = useCallback(
    (params: URLSearchParams) => {
      params.delete(urlParams.quick)
      params.delete(urlParams.from)
      params.delete(urlParams.to)
    },
    [urlParams.from, urlParams.quick, urlParams.to],
  )

  const onResetFilters = useCallback(() => {
    setQuickFilterDraft(null)
    updateSearchParams((params) => {
      clearFilterParams(params)
      return codec.applyGridState(params, {}, codec.parseSortModel(params))
    })
  }, [clearFilterParams, codec, updateSearchParams])

  const onResetTable = useCallback(() => {
    setQuickFilterDraft(null)
    setColumnState([])
    setResetTableVersion((version) => version + 1)
    try {
      window.localStorage.removeItem(columnStorageKey)
    } catch (error) {
      console.error(`Could not reset ${storageLabel} column preferences.`, error)
    }
    updateSearchParams((params) => {
      clearFilterParams(params)
      return codec.applyGridState(params, {}, [])
    })
  }, [clearFilterParams, codec, columnStorageKey, storageLabel, updateSearchParams])

  const onGridStateChange = useCallback(
    (filters: Record<string, unknown>, sort: GridSavedView['sort']) =>
      updateSearchParams((params) => codec.applyGridState(params, filters, sort)),
    [codec, updateSearchParams],
  )

  const onSaveView = useCallback(
    (rawName: string) => {
      const name = rawName.trim()
      const duplicateName = viewStore.views.some(
        (view) => view.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
      if (!name || duplicateName || columnState.length === 0) return

      persistSavedViews([
        ...viewStore.views,
        {
          id: window.crypto.randomUUID(),
          name,
          filters: { quick: quickFilter, from: fromFilter, to: toFilter, grid: filterModel },
          sort: sortModel,
          columns: columnState,
        },
      ])
    },
    [
      columnState,
      filterModel,
      fromFilter,
      persistSavedViews,
      quickFilter,
      sortModel,
      toFilter,
      viewStore.views,
    ],
  )

  const onApplySavedView = useCallback(
    (id: string) => {
      const view = viewStore.views.find(({ id: savedViewId }) => savedViewId === id)
      if (!view) return

      setQuickFilterDraft(null)
      updateSearchParams((params) => {
        setOrDelete(params, urlParams.quick, view.filters.quick)
        setOrDelete(params, urlParams.from, view.filters.from)
        setOrDelete(params, urlParams.to, view.filters.to)
        return codec.applyGridState(params, view.filters.grid, view.sort)
      })
      setColumnState(view.columns)
    },
    [codec, updateSearchParams, urlParams.from, urlParams.quick, urlParams.to, viewStore.views],
  )

  const onDeleteSavedView = useCallback(() => {
    if (!selectedSavedViewId) return
    persistSavedViews(viewStore.views.filter(({ id }) => id !== selectedSavedViewId))
  }, [persistSavedViews, selectedSavedViewId, viewStore.views])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateSearchParams((params) => {
        setOrDelete(params, urlParams.quick, quickFilter)
        return params
      })
      setQuickFilterDraft(null)
    }, quickFilterDelayMs)
    return () => window.clearTimeout(timeout)
  }, [quickFilter, updateSearchParams, urlParams.quick, urlQuickFilter])

  return {
    where,
    filterModel,
    sortModel,
    columnState,
    resetTableVersion,
    onColumnStateChange: setColumnState,
    onGridStateChange,
    filters: {
      quickFilter,
      fromFilter,
      toFilter,
      onQuickFilterChange,
      onFromFilterChange,
      onToFilterChange,
      onFilterYearToDate,
      onResetFilters,
      onResetTable,
    } satisfies GridPageFilterControls,
    views: {
      items: viewStore.views,
      selectedId: selectedSavedViewId,
      storageFailed: viewStore.failed,
      canSave: columnState.length > 0,
      onApply: onApplySavedView,
      onSave: onSaveView,
      onDelete: onDeleteSavedView,
    } satisfies GridSavedViewControls<TColumnState>,
  }
}
