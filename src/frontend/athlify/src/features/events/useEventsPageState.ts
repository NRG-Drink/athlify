import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { EventFilterInput } from './__generated__/EventsManagementPageQuery.graphql'
import {
  applyEventsGridState,
  EVENTS_COLUMN_STORAGE_KEY,
  EVENTS_VIEWS_STORAGE_KEY,
  parseEventsFilterModel,
  parseEventsSavedViews,
  parseEventsSortModel,
  serializeEventsColumnState,
  serializeEventsSavedViews,
  type EventsColumnState,
  type EventsFilterModel,
  type EventsSavedView,
  type EventsSortModel,
} from './EventsGridState'

export type EventsPageFilterControls = {
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

export type EventsSavedViewControls = {
  items: EventsSavedView[]
  selectedId: string
  storageFailed: boolean
  canSave: boolean
  onApply: (id: string) => void
  onSave: (name: string) => void
  onDelete: () => void
}

function toGraphQLDate(dateString: string): string | undefined {
  if (!dateString) return undefined

  const date = new Date(dateString)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

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

export function useEventsPageState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuickFilter = searchParams.get('q') ?? ''
  const [quickFilterDraft, setQuickFilterDraft] = useState<{
    value: string
    basedOn: string
  } | null>(null)
  const quickFilter =
    quickFilterDraft?.basedOn === urlQuickFilter ? quickFilterDraft.value : urlQuickFilter
  const fromFilter = searchParams.get('from') ?? ''
  const toFilter = searchParams.get('to') ?? ''
  const filterModel = useMemo(() => parseEventsFilterModel(searchParams), [searchParams])
  const sortModel = useMemo(() => parseEventsSortModel(searchParams), [searchParams])
  const [columnState, setColumnState] = useState<EventsColumnState[]>([])
  const [resetTableVersion, setResetTableVersion] = useState(0)
  const [viewStore, setViewStore] = useState(() => {
    try {
      return {
        views: parseEventsSavedViews(window.localStorage.getItem(EVENTS_VIEWS_STORAGE_KEY)),
        failed: false,
      }
    } catch (error) {
      console.error('Could not restore My Events saved views.', error)
      return { views: [] as EventsSavedView[], failed: true }
    }
  })

  const updateSearchParams = useCallback(
    (update: (params: URLSearchParams) => URLSearchParams) => {
      setSearchParams((current) => update(new URLSearchParams(current)), { replace: true })
    },
    [setSearchParams],
  )

  const where = useMemo(() => {
    const clauses: EventFilterInput[] = []
    if (fromFilter) clauses.push({ startDate: { gte: toGraphQLDate(fromFilter) } })
    if (toFilter) clauses.push({ endDate: { lte: toGraphQLDate(toFilter) } })
    if (urlQuickFilter.trim()) {
      const term = urlQuickFilter.trim()
      clauses.push({
        or: [{ name: { contains: term } }, { description: { contains: term } }],
      })
    }
    return clauses.length === 0 ? null : clauses.length === 1 ? clauses[0] : { and: clauses }
  }, [fromFilter, toFilter, urlQuickFilter])

  const persistSavedViews = useCallback((views: EventsSavedView[]) => {
    try {
      window.localStorage.setItem(EVENTS_VIEWS_STORAGE_KEY, serializeEventsSavedViews(views))
      setViewStore({ views, failed: false })
    } catch (error) {
      console.error('Could not save My Events saved views.', error)
      setViewStore((current) => ({ ...current, failed: true }))
    }
  }, [])

  const selectedSavedViewId =
    viewStore.views.find(
      (view) =>
        view.filters.quick === quickFilter &&
        view.filters.from === fromFilter &&
        view.filters.to === toFilter &&
        stableStringify(view.filters.grid) === stableStringify(filterModel) &&
        stableStringify(view.sort) === stableStringify(sortModel),
    )?.id ?? ''

  const onQuickFilterChange = useCallback(
    (value: string) => setQuickFilterDraft({ value, basedOn: urlQuickFilter }),
    [urlQuickFilter],
  )

  const onFromFilterChange = useCallback(
    (value: string) =>
      updateSearchParams((params) => {
        if (value) params.set('from', value)
        else params.delete('from')
        return params
      }),
    [updateSearchParams],
  )

  const onToFilterChange = useCallback(
    (value: string) =>
      updateSearchParams((params) => {
        if (value) params.set('to', value)
        else params.delete('to')
        return params
      }),
    [updateSearchParams],
  )

  const onFilterYearToDate = useCallback(() => {
    const now = new Date()
    updateSearchParams((params) => {
      params.set('from', `${now.getFullYear()}-01-01`)
      params.delete('to')
      return params
    })
  }, [updateSearchParams])

  const onResetFilters = useCallback(() => {
    setQuickFilterDraft(null)
    updateSearchParams((params) => {
      params.delete('q')
      params.delete('from')
      params.delete('to')
      return applyEventsGridState(params, {}, parseEventsSortModel(params))
    })
  }, [updateSearchParams])

  const onResetTable = useCallback(() => {
    setQuickFilterDraft(null)
    setColumnState([])
    setResetTableVersion((version) => version + 1)
    try {
      window.localStorage.removeItem(EVENTS_COLUMN_STORAGE_KEY)
    } catch (error) {
      console.error('Could not reset My Events column preferences.', error)
    }
    updateSearchParams((params) => {
      params.delete('q')
      params.delete('from')
      params.delete('to')
      return applyEventsGridState(params, {}, [])
    })
  }, [updateSearchParams])

  const onGridStateChange = useCallback(
    (filters: EventsFilterModel, sort: EventsSortModel) =>
      updateSearchParams((params) => applyEventsGridState(params, filters, sort)),
    [updateSearchParams],
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
          filters: {
            quick: quickFilter,
            from: fromFilter,
            to: toFilter,
            grid: filterModel,
          },
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
        if (view.filters.quick) params.set('q', view.filters.quick)
        else params.delete('q')
        if (view.filters.from) params.set('from', view.filters.from)
        else params.delete('from')
        if (view.filters.to) params.set('to', view.filters.to)
        else params.delete('to')
        return applyEventsGridState(params, view.filters.grid, view.sort)
      })
      setColumnState(view.columns)
    },
    [updateSearchParams, viewStore.views],
  )

  const onDeleteSavedView = useCallback(() => {
    if (!selectedSavedViewId) return
    persistSavedViews(viewStore.views.filter(({ id }) => id !== selectedSavedViewId))
  }, [persistSavedViews, selectedSavedViewId, viewStore.views])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      updateSearchParams((params) => {
        if (quickFilter) params.set('q', quickFilter)
        else params.delete('q')
        return params
      })
      setQuickFilterDraft(null)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [quickFilter, updateSearchParams, urlQuickFilter])

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
    },
    views: {
      items: viewStore.views,
      selectedId: selectedSavedViewId,
      storageFailed: viewStore.failed,
      canSave: columnState.length > 0,
      onApply: onApplySavedView,
      onSave: onSaveView,
      onDelete: onDeleteSavedView,
    },
  }
}
