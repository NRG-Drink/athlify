import { describe, expect, it } from 'vitest'
import { toggleId } from '../../lib/ids'

describe('toggleId', () => {
  it('adds a missing id at the end and removes a present one', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleId([], 'a')).toEqual(['a'])
  })
})
