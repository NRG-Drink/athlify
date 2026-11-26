import i18next from 'i18next'
import { describe, expect, it } from 'vitest'
import { activityInputFromCellChange } from '../../../features/activities/activityCellEdit'
import type { ActivityInputSource } from '../../../features/activities/activityInput'

const t = i18next.getFixedT('de')

const row: ActivityInputSource = {
  date: '2025-05-15T07:30:00.000Z',
  type: 'ROAD',
  time: 5400,
  distance: 42.5,
  elevationGain: 300,
  description: 'Morning ride',
  heartRateMin: 110,
  heartRateAverage: 140,
  heartRateMax: 170,
  mood: 'GOOD',
  effort: 5,
  wind: 'LIGHT',
  vehicle: { id: 'vehicle-1' },
  gadgets: [{ id: 'gadget-1' }],
  tags: [{ id: 'tag-1' }],
}

describe('activityInputFromCellChange', () => {
  it('converts edited date, duration and decimal cells into one valid input', () => {
    const result = activityInputFromCellChange(row, 'time', '2:05', t)

    expect(result).toMatchObject({
      input: {
        date: row.date,
        time: 7500,
        distance: 42.5,
        vehicleId: 'vehicle-1',
        gadgetIds: ['gadget-1'],
        tagIds: ['tag-1'],
      },
    })

    const dated = activityInputFromCellChange(row, 'date', '16.05.2025, 08:15', t)
    expect(dated).toMatchObject({
      input: { date: new Date(2025, 4, 16, 8, 15).toISOString() },
    })
  })

  it('keeps relationship and heart-rate edits in the complete mutation input', () => {
    const result = activityInputFromCellChange(row, 'tags', ['tag-2'], t)

    expect(result).toMatchObject({
      input: {
        heartRateMin: 110,
        heartRateAverage: 140,
        heartRateMax: 170,
        gadgetIds: ['gadget-1'],
        tagIds: ['tag-2'],
      },
    })
  })

  it('rejects invalid cell values instead of building a mutation input', () => {
    expect(activityInputFromCellChange(row, 'heartRateMin', '180', t)).toEqual({
      error: t('activities.form.errors.heartRateOrder'),
    })
    expect(activityInputFromCellChange(row, 'distance', '-1', t)).toEqual({
      error: 'Bitte einen Wert ab 0 eingeben.',
    })
  })

  it('ignores columns which are not editable activity inputs', () => {
    expect(activityInputFromCellChange(row, 'averageSpeed', 25, t)).toBeNull()
  })
})
