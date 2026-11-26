import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BodyStatsFilterInput } from './__generated__/BodyStatsGridPageQuery.graphql'
import { dayEndIso, dayStartIso } from './BodyStatsGridQuery'
import {
  applyBodyStatsGridState,
  BODY_STATS_COLUMN_STORAGE_KEY,
  BODY_STATS_FROM_PARAM,
  BODY_STATS_QUICK_PARAM,
  BODY_STATS_TO_PARAM,
  BODY_STATS_VIEWS_STORAGE_KEY,
  parseBodyStatsFilterModel,
  parseBodyStatsSavedViews,
  parseBodyStatsSortModel,
  serializeBodyStatsColumnState,
  serializeBodyStatsSavedViews,
  type BodyStatsColumnState,
  type BodyStatsFilterModel,
  type BodyStatsSavedView,
  type BodyStatsSortModel,
} from './BodyStatsGridState'

export type BodyStatsPageFilterControls = {
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

export type BodyStatsSavedViewControls = {
  items: BodyStatsSavedView[]
  selectedId: string
  storageFailed: boolean
  canSave: boolean
  onApply: (id: string) => void
  onSave: (name: string) => void
  onDelete: () => void
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

export function useBodyStatsPageState() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuickFilter = searchParams.get(BODY_STATS_QUICK_PARAM) ?? ''
  const [quickFilterDraft, setQuickFilterDraft] = useState<{
    value: string
    basedOn: string
  } | null>(null)
  const quickFilter =
    quickFilterDraft?.basedOn === urlQuickFilter ? quickFilterDraft.value : urlQuickFilter
  const fromFilter = searchParams.get(BODY_STATS_FROM_PARAM) ?? ''
  const toFilter = searchParams.get(BODY_STATS_TO_PARAM) ?? ''
  const filterModel = useMemo(() => parseBodyStatsFilterModel(searchParams), [searchParams])
  const sortModel = useMemo(() => parseBodyStatsSortModel(searchParams), [searchParams])
  const [columnState, setColumnState] = useState<BodyStatsColumnState[]>([])
  const [resetTableVersion, setResetTableVersion] = useState(0)
  const [viewStore, setViewStore] = useState(() => {
    try {
      return {
        views: parseBodyStatsSavedViews(
          window.localStorage.getItem(BODY_STATS_VIEWS_STORAGE_KEY),
        ),
        failed: false,
      }
    } catch (error) {
      console.error('Could not restore Body-Stats saved views.', error)
      return { views: [] as BodyStatsSavedView[], failed: true }
    }
  })

  const updateSearchParams = useCallback(
    (update: (params: URLSearchParams) => URLSearchParams) => {
      setSearchParams((current) => update(new URLSearchParams(current)), { replace: true })
    },
    [setSearchParams],
  )

  const where = useMemo(() => {
    const clauses: BodyStatsFilterInput[] = []
    const from = fromFilter ? dayStartIso(fromFilter) : null
    const to = toFilter ? dayEndIso(toFilter) : null
    if (from) clauses.push({ date: { gte: from } })
    if (to) clauses.push({ date: { lte: to } })
    const term = urlQuickFilter.trim()
    if (term) clauses.push({ comment: { contains: term } })
    return clauses.length === 0 ? null : clauses.length === 1 ? clauses[0]! : { and: clauses }
  }, [fromFilter, toFilter, urlQuickFilter])

  const persistSavedViews = useCallback((views: BodyStatsSavedView[]) => {
    try {
      window.localStorage.setItem(
        BODY_STATS_VIEWS_STORAGE_KEY,
        serializeBodyStatsSavedViews(views),
      )
      setViewStore({ views, failed: false })
    } catch (error) {
      console.error('Could not save Body-Stats saved views.', error)
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
        stableStringify(view.sort) === stableStringify(sortModel) &&
        serializeBodyStatsColumnState(view.columns) === serializeBodyStatsColumnState(columnState),
    )?.id ?? ''

  const onQuickFilterChange = useCallback(
    (value: string) => setQuickFilterDraft({ value, basedOn: urlQuickFilter }),
    [urlQuickFilter],
  )

  const onFromFilterChange = useCallback(
    (value: string) =>
      updateSearchParams((params) => {
        if (value) params.set(BODY_STATS_FROM_PARAM, value)
        else params.delete(BODY_STATS_FROM_PARAM)
        return params
      }),
    [updateSearchParams],
  )

  const onToFilterChange = useCallback(
    (value: string) =>
      updateSearchParams((params) => {
        if (value) params.set(BODY_STATS_TO_PARAM, value)
        else params.delete(BODY_STATS_TO_PARAM)
        return params
      }),
    [updateSearchParams],
  )

  const onFilterYearToDate = useCallback(() => {
    const now = new Date()
    updateSearchParams((params) => {
      params.set(BODY_STATS_FROM_PARAM, `${now.getFullYear()}-01-01`)
      params.delete(BODY_STATS_TO_PARAM)
      return params
    })
  }, [updateSearchParams])

  const onResetFilters = useCallback(() => {
    setQuickFilterDraft(null)
    updateSearchParams((params) => {
      params.delete(BODY_STATS_QUICK_PARAM)
      params.delete(BODY_STATS_FROM_PARAM)
      params.delete(BODY_STATS_TO_PARAM)
      return applyBodyStatsGridState(params, {}, parseBodyStatsSortModel(params))
    })
  }, [updateSearchParams])

  const onResetTable = useCallback(() => {
    setQuickFilterDraft(null)
    setColumnState([])
    setResetTableVersion((version) => version + 1)
    try {
      window.localStorage.removeItem(BODY_STATS_COLUMN_STORAGE_KEY)
    } catch (error) {
      console.error('Could not reset Body-Stats column preferences.', error)
    }
    updateSearchParams((params) => {
      params.delete(BODY_STATS_QUICK_PARAM)
      params.delete(BODY_STATS_FROM_PARAM)
      params.delete(BODY_STATS_TO_PARAM)
      return applyBodyStatsGridState(params, {}, [])
    })
  }, [updateSearchParams])

  const onGridStateChange = useCallback(
    (filters: BodyStatsFilterModel, sort: BodyStatsSortModel) =>
      updateSearchParams((params) => applyBodyStatsGridState(params, filters, sort)),
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
        if (view.filters.quick) params.set(BODY_STATS_QUICK_PARAM, view.filters.quick)
        else params.delete(BODY_STATS_QUICK_PARAM)
        if (view.filters.from) params.set(BODY_STATS_FROM_PARAM, view.filters.from)
        else params.delete(BODY_STATS_FROM_PARAM)
        if (view.filters.to) params.set(BODY_STATS_TO_PARAM, view.filters.to)
        else params.delete(BODY_STATS_TO_PARAM)
        return applyBodyStatsGridState(params, view.filters.grid, view.sort)
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
        if (quickFilter) params.set(BODY_STATS_QUICK_PARAM, quickFilter)
        else params.delete(BODY_STATS_QUICK_PARAM)
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
