import i18next from 'i18next'
import { describe, expect, it } from 'vitest'
import {
  activityToValues,
  hasDetails,
  newActivityValues,
  parseDuration,
  toInput,
  validate,
  type ActivityFormValues,
} from '../../../features/activities/activityForm'
import { nowInputValue } from '../../../lib/formValues'

const t = i18next.getFixedT('de')
const now = new Date(2026, 9, 12, 7, 30)

const valid = (overrides: Partial<ActivityFormValues> = {}): ActivityFormValues => ({
  ...newActivityValues({}, now),
  duration: '1:30',
  distance: '42,5',
  ...overrides,
})

describe('parseDuration', () => {
  it('reads h:mm with a colon or a point', () => {
    expect(parseDuration('1:30')).toBe(5400)
    expect(parseDuration('1.30')).toBe(5400)
    expect(parseDuration(' 12.05 ')).toBe(43500)
    expect(parseDuration('0:00')).toBe(0)
  })

  it('rejects anything else', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('90')).toBeNull()
    expect(parseDuration('1:75')).toBeNull()
    expect(parseDuration('1:02:05')).toBeNull()
    expect(parseDuration('1:5')).toBeNull()
    expect(parseDuration('abc')).toBeNull()
  })
})

describe('validate', () => {
  it('accepts a minimal ride', () => {
    expect(validate(valid(), t, now)).toEqual({})
  })

  it('requires date, duration and distance', () => {
    expect(validate(valid({ date: '', duration: '', distance: ' ' }), t, now)).toEqual({
      date: 'Pflichtfeld.',
      duration: 'Pflichtfeld.',
      distance: 'Pflichtfeld.',
    })
  })

  it('rejects a date more than a day ahead', () => {
    const tomorrow = nowInputValue(new Date(now.getTime() + 23 * 3600 * 1000))
    const later = nowInputValue(new Date(now.getTime() + 25 * 3600 * 1000))
    expect(validate(valid({ date: tomorrow }), t, now).date).toBeUndefined()
    expect(validate(valid({ date: later }), t, now).date).toBe(
      'Das Datum darf nicht in der Zukunft liegen.',
    )
  })

  it('checks duration format and that it is above zero', () => {
    expect(validate(valid({ duration: '90' }), t, now).duration).toBe(
      'Bitte im Format Std:Min eingeben.',
    )
    expect(validate(valid({ duration: '0:00' }), t, now).duration).toBe(
      'Bitte einen Wert grösser als 0 eingeben.',
    )
  })

  it('allows zero but not negative distance and elevation', () => {
    expect(validate(valid({ distance: '0', elevationGain: '0' }), t, now)).toEqual({})
    expect(validate(valid({ distance: '-1', elevationGain: '-5' }), t, now)).toEqual({
      distance: 'Bitte einen Wert ab 0 eingeben.',
      elevationGain: 'Bitte einen Wert ab 0 eingeben.',
    })
    expect(validate(valid({ distance: 'x' }), t, now).distance).toBe('Bitte eine Zahl eingeben.')
  })

  it('checks heart rates: whole numbers from 20 to 250', () => {
    expect(
      validate(
        valid({ heartRateMin: '19', heartRateAverage: '142,5', heartRateMax: '251' }),
        t,
        now,
      ),
    ).toEqual({
      heartRateMin: 'Bitte einen Wert zwischen 20 und 250 eingeben.',
      heartRateAverage: 'Bitte eine ganze Zahl eingeben.',
      heartRateMax: 'Bitte einen Wert zwischen 20 und 250 eingeben.',
    })
  })

  it('keeps min ≤ average ≤ max', () => {
    const order = 'Min ≤ Ø ≤ Max – bitte prüfe die Werte.'
    expect(validate(valid({ heartRateMin: '170', heartRateMax: '120' }), t, now)).toEqual({
      heartRateMax: order,
    })
    expect(
      validate(
        valid({ heartRateMin: '120', heartRateAverage: '110', heartRateMax: '170' }),
        t,
        now,
      ),
    ).toEqual({ heartRateAverage: order })
    expect(validate(valid({ heartRateAverage: '180', heartRateMax: '170' }), t, now)).toEqual({
      heartRateAverage: order,
    })
    expect(
      validate(
        valid({ heartRateMin: '120', heartRateAverage: '142', heartRateMax: '170' }),
        t,
        now,
      ),
    ).toEqual({})
  })

  it('checks effort from 1 to 10', () => {
    const message = 'Bitte einen Wert zwischen 1 und 10 wählen.'
    expect(validate(valid({ effort: '0' }), t, now).effort).toBe(message)
    expect(validate(valid({ effort: '11' }), t, now).effort).toBe(message)
    expect(validate(valid({ effort: '2.5' }), t, now).effort).toBe(message)
    expect(validate(valid({ effort: '7' }), t, now).effort).toBeUndefined()
  })

  it('limits the description', () => {
    expect(validate(valid({ description: 'x'.repeat(2001) }), t, now).description).toBe(
      'Höchstens 2000 Zeichen.',
    )
  })
})

describe('toInput', () => {
  it('maps text to the mutation input with null for empty optional fields', () => {
    expect(toInput(valid({ description: '  ', vehicleId: '' }))).toEqual({
      date: now.toISOString(),
      type: 'ROAD',
      time: 5400,
      distance: 42.5,
      elevationGain: null,
      description: null,
      heartRateMin: null,
      heartRateMax: null,
      heartRateAverage: null,
      mood: null,
      effort: null,
      wind: null,
      vehicleId: null,
      gadgetIds: [],
      tagIds: [],
    })
  })

  it('passes filled values through, trimmed and parsed', () => {
    const input = toInput(
      valid({
        elevationGain: '2340',
        description: ' Gotthard-Runde ',
        heartRateMin: '120',
        heartRateAverage: '142',
        heartRateMax: '170',
        effort: '7',
        mood: 'GOOD',
        wind: 'LIGHT',
        vehicleId: 'vehicle-1',
        gadgetIds: ['gadget-1'],
        tagIds: ['tag-1', 'tag-2'],
      }),
    )
    expect(input).toMatchObject({
      elevationGain: 2340,
      description: 'Gotthard-Runde',
      heartRateMin: 120,
      heartRateAverage: 142,
      heartRateMax: 170,
      effort: 7,
      mood: 'GOOD',
      wind: 'LIGHT',
      vehicleId: 'vehicle-1',
      gadgetIds: ['gadget-1'],
      tagIds: ['tag-1', 'tag-2'],
    })
  })

  it('keeps the stored seconds while the minutes are unchanged', () => {
    // 3725 s is shown as 1:02.
    expect(toInput(valid({ duration: '1:02', time: 3725 })).time).toBe(3725)
    expect(toInput(valid({ duration: '1.02', time: 3725 })).time).toBe(3725)
    expect(toInput(valid({ duration: '1:03', time: 3725 })).time).toBe(3780)
    expect(toInput(valid({ duration: '1:02', time: null })).time).toBe(3720)
  })
})

describe('form values', () => {
  const activity = {
    date: new Date(2026, 9, 1, 18, 15).toISOString(),
    type: 'GRAVEL',
    time: 3725,
    distance: 98,
    elevationGain: null,
    description: 'Gotthard-Runde',
    heartRateMin: null,
    heartRateMax: null,
    heartRateAverage: 142,
    mood: null,
    effort: null,
    wind: 'CALM',
    vehicle: { id: 'vehicle-1' },
    gadgets: [{ id: 'gadget-1' }],
    tags: [],
  }

  it('starts empty, with type and bicycle of the latest activity', () => {
    expect(newActivityValues({}, now)).toMatchObject({
      date: '2026-10-12T07:30',
      type: 'ROAD',
      vehicleId: '',
    })
    expect(newActivityValues({ type: 'INDOOR', vehicleId: 'vehicle-2' }, now)).toMatchObject({
      type: 'INDOOR',
      vehicleId: 'vehicle-2',
    })
  })

  it('reads an activity, and as a copy with the current date', () => {
    const values = activityToValues(activity)
    expect(values).toMatchObject({
      date: '2026-10-01T18:15',
      type: 'GRAVEL',
      duration: '1:02',
      time: 3725,
      distance: '98',
      elevationGain: '',
      vehicleId: 'vehicle-1',
      heartRateAverage: '142',
      wind: 'CALM',
      mood: '',
      gadgetIds: ['gadget-1'],
    })
    expect(activityToValues(activity, { asCopy: true, now })).toEqual({
      ...values,
      date: '2026-10-12T07:30',
    })
  })

  it('knows whether a detail field holds a value', () => {
    expect(hasDetails(newActivityValues({}, now))).toBe(false)
    expect(hasDetails(activityToValues(activity))).toBe(true)
    expect(hasDetails(valid({ tagIds: ['tag-1'] }))).toBe(true)
  })
})
