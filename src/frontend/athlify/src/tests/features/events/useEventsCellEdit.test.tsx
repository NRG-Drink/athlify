import { act, renderHook, waitFor } from '@testing-library/react'
import type { CellValueChangedEvent } from 'ag-grid-community'
import type { ReactNode } from 'react'
import { RelayEnvironmentProvider } from 'react-relay'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toaster } from '../../../components/ui/toaster'
import { useEventsCellEdit, type EventsGridRow } from '../../../features/events/useEventsCellEdit'
import { createTestEnvironment, type Handler } from '../../utils/relay'

vi.mock('../../../components/ui/toaster', () => ({ toaster: { create: vi.fn() } }))

const row: EventsGridRow = {
  id: 'event-1',
  name: 'Trail',
  startDate: '2026-03-01',
  endDate: null,
  description: '',
  type: 'GOAL',
  tags: [{ id: 'tag-1' }],
}

const updatedEvent = { id: 'event-1', name: 'Trail', startDate: '2026-03-02' }

afterEach(() => vi.clearAllMocks())

function setup(handler: Handler, onEventUpdated?: () => void) {
  const test = createTestEnvironment(handler)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RelayEnvironmentProvider environment={test.environment}>{children}</RelayEnvironmentProvider>
  )
  const { result } = renderHook(() => useEventsCellEdit(onEventUpdated), { wrapper })
  const setDataValue = vi.fn()

  const edit = (colId: string, oldValue: unknown, newValue: unknown, data: unknown = row) =>
    act(() =>
      result.current.onCellValueChanged({
        data,
        oldValue,
        newValue,
        node: { setDataValue },
        column: { getColId: () => colId },
      } as unknown as CellValueChangedEvent),
    )

  return { ...test, edit, setDataValue }
}

const errorToast = () =>
  expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }))

describe('useEventsCellEdit', () => {
  it('ignores an unchanged value and a missing row', () => {
    const { edit, fetchFn } = setup(() => ({ data: { updateEvent: updatedEvent } }))

    edit('name', 'Trail', 'Trail')
    edit('name', 'Trail', 'Other', null)

    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('saves a changed date in the ISO form and reports the updated event', async () => {
    const onEventUpdated = vi.fn()
    const { edit, calls } = setup(() => ({ data: { updateEvent: updatedEvent } }), onEventUpdated)

    edit('startDate', '2026-03-01', '02.03.2026')

    await waitFor(() => expect(onEventUpdated).toHaveBeenCalledWith(updatedEvent))
    expect(calls('EventsGridUpdateMutation')[0]).toMatchObject({
      id: 'event-1',
      event: { startDate: '2026-03-02', endDate: null, description: null, tagIds: ['tag-1'] },
    })
    expect(toaster.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
  })

  it('clears the end date when the cell is emptied', async () => {
    const { edit, calls } = setup(() => ({ data: { updateEvent: updatedEvent } }))

    edit('endDate', '2026-03-05', '')

    await waitFor(() => expect(calls('EventsGridUpdateMutation')).toHaveLength(1))
    expect(calls('EventsGridUpdateMutation')[0]).toMatchObject({ event: { endDate: null } })
  })

  it('reverts the cell without saving when the start date is empty or invalid', () => {
    const { edit, setDataValue, fetchFn } = setup(() => ({ data: { updateEvent: updatedEvent } }))

    edit('startDate', '2026-03-01', '')
    edit('startDate', '2026-03-01', 'not a date')
    edit('name', 'Trail', 'Other', { ...row, startDate: null })

    expect(fetchFn).not.toHaveBeenCalled()
    expect(setDataValue).toHaveBeenCalledTimes(3)
    expect(toaster.create).toHaveBeenCalledTimes(3)
  })

  it('reverts the cell without saving when the end date is invalid', () => {
    const { edit, setDataValue, fetchFn } = setup(() => ({ data: { updateEvent: updatedEvent } }))

    edit('endDate', null, 'not a date')
    edit('endDate', null, 42)

    expect(fetchFn).not.toHaveBeenCalled()
    expect(setDataValue).toHaveBeenCalledWith('endDate', null)
    errorToast()
  })

  it('reverts the cell when the server rejects the change', async () => {
    const { edit, setDataValue } = setup(() => ({ data: { updateEvent: null } }))

    edit('name', 'Trail', 'Other')

    await waitFor(() => expect(setDataValue).toHaveBeenCalledWith('name', 'Trail'))
    errorToast()
  })

  it('reverts the cell when the request fails', async () => {
    const { edit, setDataValue } = setup(() => Promise.reject(new Error('offline')))

    edit('name', 'Trail', 'Other')

    await waitFor(() => expect(setDataValue).toHaveBeenCalledWith('name', 'Trail'))
    errorToast()
  })
})
