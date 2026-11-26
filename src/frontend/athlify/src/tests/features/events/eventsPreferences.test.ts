import { describe, expect, it } from 'vitest'
import { parseEventsPreferences } from '../../../features/events/eventsPreferences'

describe('parseEventsPreferences', () => {
  it('keeps a stored boolean', () => {
    expect(parseEventsPreferences('{"controlsOpen":false}').controlsOpen).toBe(false)
  })

  it.each([null, '', 'not json', 'null', '"text"', '{"controlsOpen":3}', '{}'])(
    'falls back to an open panel for %j',
    (raw) => {
      expect(parseEventsPreferences(raw).controlsOpen).toBe(true)
    },
  )
})
