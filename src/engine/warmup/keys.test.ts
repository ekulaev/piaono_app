import { describe, expect, it } from 'vitest'
import { DEFAULT_TONALITY_ID, TONALITIES, alterationOf, isTonalityId, tonalityById } from './keys'

describe('Тональности', () => {
  it('30 строк: без знаков, диезы 1–7, бемоли 1–7; в наборе мажор, затем минор', () => {
    expect(TONALITIES).toHaveLength(30)
    const order = TONALITIES.map((t) => `${t.kind}${t.signs}:${t.mode}`)
    expect(order.slice(0, 4)).toEqual([
      'none0:major',
      'none0:minor',
      'sharp1:major',
      'sharp1:minor',
    ])
    expect(order[14]).toBe('sharp7:major')
    expect(order[15]).toBe('sharp7:minor')
    expect(order[16]).toBe('flat1:major')
    expect(order[29]).toBe('flat7:minor')
    // Число знаков растёт внутри диезной и внутри бемольной части.
    const sharps = TONALITIES.filter((t) => t.kind !== 'flat').map((t) => t.signs)
    expect(sharps).toEqual([...sharps].sort((a, b) => a - b))
  })

  it('идентификаторы уникальны, по умолчанию — До мажор без знаков', () => {
    expect(new Set(TONALITIES.map((t) => t.id)).size).toBe(30)
    expect(DEFAULT_TONALITY_ID).toBe('C-major')
    expect(tonalityById(DEFAULT_TONALITY_ID).signs).toBe(0)
    expect(isTonalityId('G-major')).toBe(true)
    expect(isTonalityId('H-major')).toBe(false)
  })

  it('знаки при ключе в порядке записи на стане (приложение Г)', () => {
    expect(tonalityById('Cs-major').altered).toEqual(['F', 'C', 'G', 'D', 'A', 'E', 'B'])
    expect(tonalityById('Cb-major').altered).toEqual(['B', 'E', 'A', 'D', 'G', 'C', 'F'])
    expect(tonalityById('Bb-major').altered).toEqual(['B', 'E'])
    expect(tonalityById('Fs-minor').altered).toEqual(['F', 'C', 'G'])
  })

  it('минор и мажор одних знаков имеют одни и те же знаки', () => {
    for (const major of TONALITIES.filter((t) => t.mode === 'major')) {
      const minor = TONALITIES.find(
        (t) => t.mode === 'minor' && t.signs === major.signs && t.kind === major.kind,
      )
      expect(minor?.altered).toEqual(major.altered)
    }
  })

  it('знак ступени: диез, бемоль или без знака', () => {
    expect(alterationOf(tonalityById('G-major'), 'F')).toBe(1)
    expect(alterationOf(tonalityById('G-major'), 'C')).toBe(0)
    expect(alterationOf(tonalityById('F-major'), 'B')).toBe(-1)
    expect(alterationOf(tonalityById('C-major'), 'F')).toBe(0)
  })
})
