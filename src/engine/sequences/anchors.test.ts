import { describe, expect, it } from 'vitest'
import { anchorsIn, intervalBetween, moveBy, widestFitting } from './anchors'
import { RANGES } from './generate'

describe('Опорные ноты', () => {
  it('Басовая позиция: C3 и F3', () => {
    const { low, high } = RANGES.position.bass
    expect(anchorsIn('bass', low, high)).toEqual([48, 53])
  })

  it('в каждом диапазоне не меньше двух опорных нот своего ключа', () => {
    for (const range of Object.values(RANGES)) {
      expect(anchorsIn('treble', range.treble.low, range.treble.high).length).toBeGreaterThan(1)
      expect(anchorsIn('bass', range.bass.low, range.bass.high).length).toBeGreaterThan(1)
    }
  })
})

describe('Интервалы по ступеням стана', () => {
  it('E4 → C4 — терция вниз', () => {
    expect(intervalBetween(64, 60)).toEqual({ size: 3, direction: 'down' })
  })

  it('G4 → A4 — секунда вверх', () => {
    expect(intervalBetween(67, 69)).toEqual({ size: 2, direction: 'up' })
  })

  it('C4 → C5 — октава вверх', () => {
    expect(intervalBetween(60, 72)).toEqual({ size: 8, direction: 'up' })
  })

  it('moveBy — обратная к intervalBetween', () => {
    expect(moveBy(67, 3, 'down')).toBe(64) // G4 → E4
    expect(moveBy(48, 5, 'up')).toBe(55) // C3 → G3
    expect(moveBy(21, 2, 'down')).toBeNull() // ниже A0 клавиш нет
  })

  it('Позиция + До октавы — не больше квинты', () => {
    const { low, high } = RANGES.position.treble
    expect(widestFitting(low, high, 'octave')).toBe(5)
    expect(widestFitting(low, high, 'third')).toBe(3)
    expect(widestFitting(RANGES.octave.bass.low, RANGES.octave.bass.high, 'octave')).toBe(8)
  })
})
