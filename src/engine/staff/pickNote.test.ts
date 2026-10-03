import { describe, expect, it } from 'vitest'
import { isBlackKey } from '../keyboard/layout'
import type { Weights } from '../stats/weights'
import { tonalityById } from '../warmup/keys'
import { DEFAULT_WARMUP_SETTINGS, type WarmupSettings } from '../warmup/settings'
import { stepOf } from '../warmup/steps'
import { buildPool, pickNote } from './pickNote'

/** Простой предсказуемый генератор (mulberry32), чтобы тест был воспроизводимым. */
function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const settings = (change: Partial<WarmupSettings>): WarmupSettings => ({
  ...DEFAULT_WARMUP_SETTINGS,
  ...change,
})

/** Прежняя таблица «Разминки»: белые клавиши B1–D6, общая зона G3–F4 делится между ключами. */
const OLD_RANGES = { treble: { low: 55, high: 86 }, bass: { low: 35, high: 65 } }
function oldPairs() {
  const pairs: { pitch: number; clef: string; base: number }[] = []
  for (let pitch = 35; pitch <= 86; pitch++) {
    if (isBlackKey(pitch)) continue
    const clefs = (['bass', 'treble'] as const).filter(
      (clef) => pitch >= OLD_RANGES[clef].low && pitch <= OLD_RANGES[clef].high,
    )
    for (const clef of clefs) pairs.push({ pitch, clef, base: 1 / clefs.length })
  }
  return pairs
}

describe('Набор нот по умолчанию', () => {
  it('совпадает с прежним: те же ноты, ключи и вероятности в том же порядке', () => {
    const pool = buildPool(DEFAULT_WARMUP_SETTINGS).map(({ note, base }) => ({
      pitch: note.pitch,
      clef: note.clef,
      base,
    }))
    expect(pool).toEqual(oldPairs())
  })

  it('Диапазон: 1000 нот — белые клавиши B1–D6, ключ по диапазону, оба ключа встречаются', () => {
    const random = seeded(42)
    const clefs = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const note = pickNote(random)
      expect(isBlackKey(note.pitch)).toBe(false)
      expect(note.natural).toBe(false)
      const range = OLD_RANGES[note.clef]
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
    expect(pickNote(() => 0)).toMatchObject({ pitch: 35, clef: 'bass' })
    expect(pickNote(() => 0.9999)).toMatchObject({ pitch: 86, clef: 'treble' })
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

describe('Ключ и диапазон из настроек', () => {
  it('один ключ: только он, в своём диапазоне', () => {
    const bass = settings({
      clef: 'bass',
      bassRange: { low: stepOf('C', 2), high: stepOf('C', 4) },
    })
    const random = seeded(11)
    for (let i = 0; i < 1000; i++) {
      const note = pickNote(random, undefined, bass)
      expect(note.clef).toBe('bass')
      expect(note.pitch).toBeGreaterThanOrEqual(36)
      expect(note.pitch).toBeLessThanOrEqual(60)
    }
  })

  it('общая зона определяется по ступени: нота входит в оба ключа с половинной вероятностью', () => {
    const pool = buildPool(DEFAULT_WARMUP_SETTINGS)
    const a3 = pool.filter(({ note }) => note.pitch === 57)
    expect(a3.map(({ note }) => note.clef).sort()).toEqual(['bass', 'treble'])
    expect(a3.every(({ base }) => base === 0.5)).toBe(true)
  })

  it('крайние ступени допустимых диапазонов в наборе: E3, F6, G1, A4', () => {
    const wide = settings({
      trebleRange: { low: stepOf('E', 3), high: stepOf('F', 6) },
      bassRange: { low: stepOf('G', 1), high: stepOf('A', 4) },
    })
    const steps = new Set(buildPool(wide).map(({ note }) => note.step))
    for (const step of [stepOf('E', 3), stepOf('F', 6), stepOf('G', 1), stepOf('A', 4)]) {
      expect(steps.has(step)).toBe(true)
    }
  })
})

describe('Тональность и бекар', () => {
  const sol = settings({ tonality: 'G-major', clef: 'treble' })

  it('Нота тональности: в Соль мажоре ступень F звучит как F♯, остальные — белые клавиши', () => {
    const random = seeded(5)
    let sharps = 0
    for (let i = 0; i < 1000; i++) {
      const note = pickNote(random, undefined, sol)
      expect(note.natural).toBe(false)
      if (note.step % 7 === 3) {
        expect(isBlackKey(note.pitch)).toBe(true)
        expect(note.pitch % 12).toBe(6)
        sharps++
      } else {
        expect(isBlackKey(note.pitch)).toBe(false)
      }
    }
    expect(sharps).toBeGreaterThan(0)
  })

  it('чёрные клавиши — только как ноты тональности', () => {
    for (const { note } of buildPool(settings({ tonality: 'D-major' }))) {
      const letter = note.step % 7
      // D мажор: F (3) и C (0) со знаком; остальные белые.
      expect(isBlackKey(note.pitch)).toBe(letter === 3 || letter === 0)
    }
  })

  it('минор с теми же знаками даёт те же ноты, что мажор', () => {
    const pitches = (id: string) =>
      buildPool(settings({ tonality: id })).map(({ note }) => note.pitch)
    expect(pitches('E-minor')).toEqual(pitches('G-major'))
    expect(pitches('D-minor')).toEqual(pitches('F-major'))
  })

  it('бемоль: в Фа мажоре ступень B звучит как B♭; C♭ мажор — C пишется как B', () => {
    const fa = buildPool(settings({ tonality: 'F-major', clef: 'treble' }))
    const b = fa.find(({ note }) => note.step === stepOf('B', 4))!
    expect(b.note.pitch).toBe(70)
    const cFlat = buildPool(settings({ tonality: 'Cb-major', clef: 'treble' }))
    const c4 = cFlat.find(({ note }) => note.step === stepOf('C', 4))!
    expect(c4.note.pitch).toBe(59)
  })

  it('Бекар по ступеням со знаком: только у них, и каждая в двух видах', () => {
    const re = settings({ tonality: 'D-major', clef: 'treble', naturals: true })
    const pool = buildPool(re)
    for (const { note } of pool) {
      const letter = note.step % 7
      if (note.natural) {
        expect(letter === 3 || letter === 0).toBe(true)
        expect(isBlackKey(note.pitch)).toBe(false)
      }
    }
    const f4 = pool.filter(({ note }) => note.step === stepOf('F', 4))
    expect(f4.map(({ note }) => [note.pitch, note.natural])).toEqual([
      [66, false],
      [65, true],
    ])
  })

  it('без бекара или без знаков бекара нет', () => {
    const off = buildPool(settings({ tonality: 'D-major', naturals: false }))
    expect(off.some(({ note }) => note.natural)).toBe(false)
    const none = buildPool(settings({ tonality: 'C-major', naturals: true }))
    expect(none.some(({ note }) => note.natural)).toBe(false)
  })

  it('без статистики нота со знаком и та же с бекаром равновероятны', () => {
    const re = settings({ tonality: 'D-major', clef: 'treble', naturals: true })
    const random = seeded(9)
    const counts = { sharp: 0, natural: 0 }
    for (let i = 0; i < 10_000; i++) {
      const note = pickNote(random, undefined, re)
      if (note.step === stepOf('F', 4)) counts[note.natural ? 'natural' : 'sharp']++
    }
    expect(counts.sharp / counts.natural).toBeGreaterThan(0.75)
    expect(counts.sharp / counts.natural).toBeLessThan(1.25)
  })

  it('трудная нота с бекаром выпадает чаще', () => {
    const re = settings({ tonality: 'D-major', clef: 'treble', naturals: true })
    const weights: Weights = {
      note: (_clef, pitch) => (pitch === 65 ? 3 : 1),
      interval: () => 1,
    }
    const random = seeded(2)
    const counts = { sharp: 0, natural: 0 }
    for (let i = 0; i < 10_000; i++) {
      const note = pickNote(random, weights, re)
      if (note.step === stepOf('F', 4)) counts[note.natural ? 'natural' : 'sharp']++
    }
    expect(counts.natural / counts.sharp).toBeGreaterThan(2.25)
  })

  it('знаки берутся из таблицы тональностей', () => {
    expect(tonalityById('Fs-major').altered).toEqual(['F', 'C', 'G', 'D', 'A', 'E'])
  })
})
