import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  activityFilterModel,
  applyActivityQuery,
  defaultActivitySort,
  parseActivityQuery,
  splitActivityFilterModel,
  type ActivityGridFilterModel,
  type ActivityQuery,
  type ActivitySort,
} from './activityQuery'
import { setActivityFilterValues, type ActivityFilterKey } from './activityFilters'
import {
  ACTIVITIES_COLUMN_STORAGE_KEY,
  ACTIVITIES_VIEWS_STORAGE_KEY,
  parseActivitiesSavedViews,
  serializeActivitiesSavedViews,
  type ActivitiesColumnState,
  type ActivitiesSavedView,
} from './ActivitiesGridState'
import { localDateKey } from '../../lib/period'

type ReplaceParams = (params: URLSearchParams) => void

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

function initialViewStore() {
  try {
    const raw = window.localStorage.getItem(ACTIVITIES_VIEWS_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) throw new Error('Saved Activities views must be a JSON array.')
    return { views: parseActivitiesSavedViews(raw), failed: false }
  } catch (error) {
    console.error('Could not restore Activities saved views.', error)
    return { views: [] as ActivitiesSavedView[], failed: true }
  }
}

export function useActivitiesPageState(
  searchParams: URLSearchParams,
  replaceParams: ReplaceParams,
) {
  const query = useMemo(() => parseActivityQuery(searchParams), [searchParams])
  const [quickFilterDraft, setQuickFilterDraft] = useState<{
    value: string
    basedOn: string
  } | null>(null)
  const quickFilter =
    quickFilterDraft?.basedOn === query.quickFilter ? quickFilterDraft.value : query.quickFilter
  const currentQuery = useMemo(() => ({ ...query, quickFilter }), [query, quickFilter])
  const filterModel = useMemo(() => activityFilterModel(query), [query])
  const [columnState, setColumnState] = useState<ActivitiesColumnState[]>([])
  const [resetTableVersion, setResetTableVersion] = useState(0)
  const [viewStore, setViewStore] = useState(initialViewStore)

  const changeQuery = useCallback(
    (next: ActivityQuery) => replaceParams(applyActivityQuery(searchParams, next)),
    [replaceParams, searchParams],
  )

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (quickFilter !== query.quickFilter) {
        changeQuery({ ...query, quickFilter })
      }
      setQuickFilterDraft(null)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [changeQuery, quickFilter, query])

  const onQuickFilterChange = useCallback(
    (value: string) => setQuickFilterDraft({ value, basedOn: query.quickFilter }),
    [query.quickFilter],
  )

  const onFromFilterChange = useCallback(
    (fromFilter: string) => changeQuery({ ...currentQuery, fromFilter }),
    [changeQuery, currentQuery],
  )
  const onToFilterChange = useCallback(
    (toFilter: string) => changeQuery({ ...currentQuery, toFilter }),
    [changeQuery, currentQuery],
  )
  const onFilterYearToDate = useCallback(() => {
    const now = new Date()
    const fromFilter = `${now.getFullYear()}-01-01`
    changeQuery({ ...currentQuery, fromFilter, toFilter: localDateKey(now) })
  }, [changeQuery, currentQuery])

  const onResetFilters = useCallback(
    () => {
      setQuickFilterDraft(null)
      changeQuery({
        ...currentQuery,
        filters: {},
        gridFilters: {},
        quickFilter: '',
        fromFilter: '',
        toFilter: '',
      })
    },
    [changeQuery, currentQuery],
  )

  const onResetTable = useCallback(() => {
    setQuickFilterDraft(null)
    setColumnState([])
    setResetTableVersion((version) => version + 1)
    try {
      window.localStorage.removeItem(ACTIVITIES_COLUMN_STORAGE_KEY)
    } catch (error) {
      console.error('Could not reset Activities column preferences.', error)
    }
    changeQuery({
      filters: {},
      gridFilters: {},
      quickFilter: '',
      fromFilter: '',
      toFilter: '',
      sort: defaultActivitySort,
    })
  }, [changeQuery])

  const onGridStateChange = useCallback(
    (model: ActivityGridFilterModel, sort: ActivitySort) => {
      const split = splitActivityFilterModel(model)
      changeQuery({ ...currentQuery, ...split, sort })
    },
    [changeQuery, currentQuery],
  )
  const onActivityFilterChange = useCallback(
    (key: ActivityFilterKey, values: string[]) =>
      changeQuery({
        ...currentQuery,
        filters: setActivityFilterValues(currentQuery.filters, key, values),
      }),
    [changeQuery, currentQuery],
  )

  const selectedViewId =
    viewStore.views.find(
      (view) =>
        stableStringify(
          applyActivityQuery(new URLSearchParams(), view.query).toString(),
        ) ===
        stableStringify(applyActivityQuery(new URLSearchParams(), currentQuery).toString()) &&
        stableStringify(view.columns) === stableStringify(columnState),
    )?.id ?? ''

  const persistSavedViews = useCallback((views: ActivitiesSavedView[]) => {
    try {
      window.localStorage.setItem(ACTIVITIES_VIEWS_STORAGE_KEY, serializeActivitiesSavedViews(views))
      setViewStore({ views, failed: false })
    } catch (error) {
      console.error('Could not save Activities views.', error)
      setViewStore((current) => ({ ...current, failed: true }))
    }
  }, [])

  const onSaveView = useCallback(
    (rawName: string) => {
      const name = rawName.trim()
      if (
        !name ||
        name.length > 80 ||
        columnState.length === 0 ||
        viewStore.views.some((view) => view.name.toLocaleLowerCase() === name.toLocaleLowerCase())
      ) {
        return
      }
      persistSavedViews([
        ...viewStore.views,
        { id: window.crypto.randomUUID(), name, query: currentQuery, columns: columnState },
      ])
    },
    [columnState, currentQuery, persistSavedViews, viewStore.views],
  )

  const onApplyView = useCallback(
    (id: string) => {
      const view = viewStore.views.find((item) => item.id === id)
      if (!view) return
      setQuickFilterDraft(null)
      setColumnState(view.columns)
      changeQuery(view.query)
    },
    [changeQuery, viewStore.views],
  )

  const onDeleteView = useCallback(() => {
    if (!selectedViewId) return
    persistSavedViews(viewStore.views.filter((view) => view.id !== selectedViewId))
  }, [persistSavedViews, selectedViewId, viewStore.views])

  return {
    query,
    filterModel,
    columnState,
    resetTableVersion,
    onColumnStateChange: setColumnState,
    onGridStateChange,
    filters: {
      quickFilter,
      fromFilter: query.fromFilter,
      toFilter: query.toFilter,
      activityFilters: currentQuery.filters,
      onQuickFilterChange,
      onFromFilterChange,
      onToFilterChange,
      onFilterYearToDate,
      onResetFilters,
      onResetTable,
      onActivityFilterChange,
    },
    views: {
      items: viewStore.views,
      selectedId: selectedViewId,
      storageFailed: viewStore.failed,
      canSave: columnState.length > 0,
      onApply: onApplyView,
      onSave: onSaveView,
      onDelete: onDeleteView,
    },
  }
}

export type ActivitiesPageState = ReturnType<typeof useActivitiesPageState>
