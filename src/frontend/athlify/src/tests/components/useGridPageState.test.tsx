import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  EVENTS_COLUMN_STORAGE_KEY,
  EVENTS_VIEWS_STORAGE_KEY,
  parseEventsSavedViews,
} from '../../features/events/EventsGridState'
import { useEventsPageState } from '../../features/events/useEventsPageState'

const columns = [{ colId: 'name', width: 200 }]
const sort = JSON.stringify([{ colId: 'name', sort: 'asc' }])

function renderState(url = '/') {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => ({ state: useEventsPageState(), search: useLocation().search }), {
    wrapper,
  })
}

const params = (search: string) => new URLSearchParams(search)

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('useGridPageState', () => {
  it('writes the to date into the URL and removes it again when emptied', async () => {
    const { result } = renderState()

    act(() => result.current.state.filters.onToFilterChange('2026-02-01'))
    await waitFor(() => expect(params(result.current.search).get('to')).toBe('2026-02-01'))

    act(() => result.current.state.filters.onToFilterChange(''))
    await waitFor(() => expect(params(result.current.search).has('to')).toBe(false))
  })

  it('resets the filters but keeps the sort', async () => {
    const { result } = renderState(
      `/?${new URLSearchParams({ q: 'run', from: '2026-01-01', gridSort: sort })}`,
    )

    act(() => result.current.state.filters.onResetFilters())

    await waitFor(() => expect(params(result.current.search).has('q')).toBe(false))
    expect(params(result.current.search).has('from')).toBe(false)
    expect(params(result.current.search).get('gridSort')).toBe(sort)
  })

  it('resets the table, its stored columns and the sort', async () => {
    localStorage.setItem(EVENTS_COLUMN_STORAGE_KEY, JSON.stringify(columns))
    const { result } = renderState(`/?${new URLSearchParams({ q: 'run', gridSort: sort })}`)

    act(() => result.current.state.filters.onResetTable())

    await waitFor(() => expect(result.current.search).toBe(''))
    expect(localStorage.getItem(EVENTS_COLUMN_STORAGE_KEY)).toBeNull()
    expect(result.current.state.resetTableVersion).toBe(1)
  })

  it('still resets the table when the stored columns cannot be removed', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { result } = renderState('/?q=run')

    act(() => result.current.state.filters.onResetTable())

    await waitFor(() => expect(result.current.search).toBe(''))
    expect(log).toHaveBeenCalled()
  })

  it('saves, applies and deletes a view', async () => {
    const { result } = renderState('/?q=run&from=2026-01-01')
    act(() => result.current.state.onColumnStateChange(columns))

    act(() => result.current.state.views.onSave('  Runs  '))
    expect(parseEventsSavedViews(localStorage.getItem(EVENTS_VIEWS_STORAGE_KEY))).toHaveLength(1)
    await waitFor(() => expect(result.current.state.views.selectedId).not.toBe(''))

    act(() => result.current.state.filters.onResetFilters())
    await waitFor(() => expect(result.current.state.views.selectedId).toBe(''))

    act(() => result.current.state.views.onApply(result.current.state.views.items[0]!.id))
    await waitFor(() => expect(params(result.current.search).get('q')).toBe('run'))
    expect(params(result.current.search).get('from')).toBe('2026-01-01')

    act(() => result.current.state.views.onDelete())
    expect(result.current.state.views.items).toEqual([])
  })

  it('does not save a view without columns', () => {
    const { result } = renderState()

    act(() => result.current.state.views.onSave('Runs'))

    expect(result.current.state.views.items).toEqual([])
  })

  it('does not save an empty or duplicate view name', () => {
    const { result } = renderState()
    act(() => result.current.state.onColumnStateChange(columns))

    act(() => result.current.state.views.onSave('   '))
    act(() => result.current.state.views.onSave('Runs'))
    act(() => result.current.state.views.onSave('runs'))

    expect(result.current.state.views.items).toHaveLength(1)
  })

  it('ignores applying or deleting a view that does not exist', () => {
    const { result } = renderState('/?q=run')

    act(() => result.current.state.views.onApply('missing'))
    act(() => result.current.state.views.onDelete())

    expect(params(result.current.search).get('q')).toBe('run')
  })

  it('flags a storage failure when the saved views cannot be read', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    const { result } = renderState()

    expect(result.current.state.views.storageFailed).toBe(true)
    expect(result.current.state.views.items).toEqual([])
  })

  it('flags a storage failure when a view cannot be saved', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    const { result } = renderState()
    act(() => result.current.state.onColumnStateChange(columns))

    act(() => result.current.state.views.onSave('Runs'))

    expect(result.current.state.views.storageFailed).toBe(true)
    expect(result.current.state.views.items).toEqual([])
  })
})
