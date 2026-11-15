import { describe, expect, it } from 'vitest'
import { getGridQuery } from '../../../features/events/MyEventsGridQuery'

describe('MyEventsPage grid type filter', () => {
  it('sends selected event types to the server while retaining other filters', () => {
    const baseWhere = { name: { contains: 'service' } }
    const query = getGridQuery([], { type: { values: ['REPAIR', 'GOAL'] } }, baseWhere)

    expect(query.where).toEqual({
      and: [baseWhere, { type: { in: ['REPAIR', 'GOAL'] } }],
    })
  })

  it('keeps an empty selection as a filter that matches no types', () => {
    const query = getGridQuery([], { type: { values: [] } }, null)

    expect(query.where).toEqual({ type: { in: [] } })
  })
})
