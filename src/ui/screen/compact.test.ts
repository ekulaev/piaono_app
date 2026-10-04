import { describe, expect, it } from 'vitest'
import { COMPACT_QUERY, isCompactSize } from './compact'

describe('isCompactSize', () => {
  it.each([
    [1280, 720, false],
    [1280, 752, false],
    [960, 600, false],
    [959, 800, true],
    [1280, 559, true],
    [1280, 560, false],
    [740, 360, true],
    [360, 740, true],
  ])('%i×%i → %s', (width, height, expected) => {
    expect(isCompactSize(width, height)).toBe(expected)
  })
})

describe('COMPACT_QUERY', () => {
  it('строится из тех же порогов в rem', () => {
    expect(COMPACT_QUERY).toBe('(height < 35rem) or (width < 60rem)')
  })
})
