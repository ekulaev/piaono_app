import { describe, expect, it } from 'vitest'
import { fitHintScale, intervalHintWidth, MIN_HINT_GAP, MIN_HINT_SCALE } from './hintFit'

describe('fitHintScale', () => {
  const width = intervalHintWidth(17)

  it('не меняет подсказку, которая помещается', () => {
    expect(fitHintScale(100, width)).toBe(1)
    expect(fitHintScale(width + MIN_HINT_GAP, width)).toBe(1)
  })

  it('уменьшает подсказку до ширины «расстояние минус зазор»', () => {
    const gap = width * 0.8 + MIN_HINT_GAP
    expect(fitHintScale(gap, width) * width).toBeCloseTo(gap - MIN_HINT_GAP)
  })

  it('не уменьшает сильнее предела', () => {
    expect(fitHintScale(10, width)).toBe(MIN_HINT_SCALE)
    expect(fitHintScale(0, width)).toBe(MIN_HINT_SCALE)
  })
})

describe('intervalHintWidth', () => {
  it('складывает стрелку, зазор и цифру', () => {
    expect(intervalHintWidth(17)).toBe(13 + 4 + 17)
  })
})
