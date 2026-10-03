import { describe, expect, it } from 'vitest'
import { DEFAULT_TONALITY_ID, TONALITIES, alterationOf, isTonalityId, tonalityById } from './keys'

describe('Тональности', () => {
  it('15 строк: без знаков, диезы 1–7, бемоли 1–7', () => {
    expect(TONALITIES).toHaveLength(15)
    const order = TONALITIES.map((t) => `${t.kind}${t.signs}`)
    expect(order).toEqual([
      'none0',
      ...[1, 2, 3, 4, 5, 6, 7].map((n) => `sharp${n}`),
      ...[1, 2, 3, 4, 5, 6, 7].map((n) => `flat${n}`),
    ])
  })

  it('идентификаторы мажорные и уникальны, по умолчанию — До мажор без знаков', () => {
    expect(new Set(TONALITIES.map((t) => t.id)).size).toBe(15)
    expect(TONALITIES.every((t) => t.id.endsWith('-major'))).toBe(true)
    expect(DEFAULT_TONALITY_ID).toBe('C-major')
    expect(tonalityById(DEFAULT_TONALITY_ID).signs).toBe(0)
    expect(isTonalityId('G-major')).toBe(true)
    // Минорные идентификаторы в сохранённых данных не принимаются: их не было ни в одной сохранённой версии.
    expect(isTonalityId('E-minor')).toBe(false)
    expect(isTonalityId('H-major')).toBe(false)
  })

  it('знаки при ключе в порядке записи на стане (приложение Г)', () => {
    expect(tonalityById('Cs-major').altered).toEqual(['F', 'C', 'G', 'D', 'A', 'E', 'B'])
    expect(tonalityById('Cb-major').altered).toEqual(['B', 'E', 'A', 'D', 'G', 'C', 'F'])
    expect(tonalityById('Bb-major').altered).toEqual(['B', 'E'])
    expect(tonalityById('Fs-major').altered).toEqual(['F', 'C', 'G', 'D', 'A', 'E'])
  })

  it('название для VexFlow: диез и бемоль', () => {
    expect(tonalityById('Fs-major').signature).toBe('F#')
    expect(tonalityById('Bb-major').signature).toBe('Bb')
    expect(tonalityById('C-major').signature).toBe('C')
  })

  it('знак ступени: диез, бемоль или без знака', () => {
    expect(alterationOf(tonalityById('G-major'), 'F')).toBe(1)
    expect(alterationOf(tonalityById('G-major'), 'C')).toBe(0)
    expect(alterationOf(tonalityById('F-major'), 'B')).toBe(-1)
    expect(alterationOf(tonalityById('C-major'), 'F')).toBe(0)
  })
})
