import { describe, expect, it } from 'vitest'
import { isBlackKey } from '../keyboard/layout'
import type { Weights } from '../stats/weights'
import { CLEF_RANGES, pickNote } from './pickNote'

/** Простой предсказуемый генератор, чтобы тест был воспроизводимым. */
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

describe('Выбор ноты и ключа', () => {
  it('Диапазон: 1000 нот — белые клавиши B1–D6, ключ по диапазону, оба ключа встречаются', () => {
    const random = seeded(42)
    const clefs = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const note = pickNote(random)
      expect(isBlackKey(note.pitch)).toBe(false)
      expect(note.pitch).toBeGreaterThanOrEqual(35)
      expect(note.pitch).toBeLessThanOrEqual(86)
      const range = CLEF_RANGES[note.clef]
      expect(note.pitch).toBeGreaterThanOrEqual(range.low)
      expect(note.pitch).toBeLessThanOrEqual(range.high)
      clefs.add(note.clef)
    }
    expect(clefs).toEqual(new Set(['treble', 'bass']))
  })

  it('Общая зона ключей: A3 встречается и в скрипичном, и в басовом', () => {
    const random = seeded(7)
    const clefsForA3 = new Set<string>()
    for (let i = 0; i < 3000; i++) {
      const note = pickNote(random)
      if (note.pitch === 57) clefsForA3.add(note.clef)
    }
    expect(clefsForA3).toEqual(new Set(['treble', 'bass']))
  })

  it('крайние ноты: B1 только басовый, D6 только скрипичный', () => {
    expect(pickNote(() => 0)).toEqual({ pitch: 35, clef: 'bass' })
    expect(pickNote(() => 0.9999)).toEqual({ pitch: 86, clef: 'treble' })
  })

  it('Трудная нота чаще: скрипичная F5 втрое тяжелее — втрое чаще других нот вне общей зоны', () => {
    const weights: Weights = {
      note: (clef, pitch) => (clef === 'treble' && pitch === 77 ? 3 : 1),
      interval: () => 1,
    }
    const random = seeded(3)
    const counts = new Map<string, number>()
    for (let i = 0; i < 10_000; i++) {
      const note = pickNote(random, weights)
      const key = `${note.clef}:${note.pitch}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    // Вне общей зоны ключей у каждой ноты одна пара; сравниваем с их средним.
    const outside = [...counts.entries()].filter(([key]) => {
      const pitch = Number(key.split(':')[1])
      return pitch !== 77 && (pitch < 55 || pitch > 65)
    })
    const average = outside.reduce((sum, [, n]) => sum + n, 0) / outside.length
    expect(counts.get('treble:77')! / average).toBeGreaterThan(2.25)
    expect(counts.get('treble:77')! / average).toBeLessThan(3.75)
    // Все пары диапазона встречаются: 31 белая клавиша, из них 7 в общей зоне G3–F4 — 38 пар.
    expect(counts.size).toBe(38)
  })
})
