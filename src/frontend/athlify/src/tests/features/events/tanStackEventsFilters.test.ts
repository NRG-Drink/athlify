import { describe, expect, it } from 'vitest'
import {
  applyTanStackEventsFilters,
  parseTanStackEventsFilters,
} from '../../../features/events/tanStackEventsFilters'

describe('TanStack Events URL filters', () => {
  it('round-trips the global, text, type, and inclusive date filters while preserving other params', () => {
    const filters = {
      globalFilter: 'Rennen',
      columnFilters: [
        { id: 'name', value: 'Sturz' },
        { id: 'type', value: 'CRASH' },
        { id: 'startDate', value: { from: '2026-10-10', to: '2026-10-12' } },
        { id: 'endDate', value: { to: '2026-10-14' } },
        { id: 'description', value: 'Kurve' },
        { id: 'tags', value: 'Wettkampf' },
      ],
    }

    const params = applyTanStackEventsFilters(new URLSearchParams('keep=1'), filters)

    expect(params.get('keep')).toBe('1')
    expect(parseTanStackEventsFilters(params)).toEqual(filters)
  })

  it('ignores invalid enum and date filters from the URL', () => {
    const filters = parseTanStackEventsFilters(
      new URLSearchParams(
        'eventsTableType=UNKNOWN&eventsTableStartFrom=2026-02-31&eventsTableEndFrom=2026-10-12&eventsTableEndTo=2026-10-10',
      ),
    )

    expect(filters).toEqual({ globalFilter: '', columnFilters: [] })
  })
})
