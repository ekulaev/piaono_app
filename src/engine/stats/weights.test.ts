import { describe, expect, it } from 'vitest'
import { aggregate, emptyModeStats, type ItemStats, type StatEvent } from './stats'
import { difficulty, figureWeights, medianAvg, weightedPick, weightOf, weightsFor } from './weights'

const item = (change: Partial<ItemStats>): ItemStats => ({
  attempts: 5,
  clean: 5,
  errors: 0,
  skips: 0,
  timeCount: 0,
  avgMs: 0,
  ...change,
})

describe('Трудность места', () => {
  it('Частые ошибки: 3 ошибки и 1 пропуск из 5 — трудность 0,8, вес 2,6', () => {
    const d = difficulty(item({ clean: 1, errors: 3, skips: 1 }), null)
    expect(d).toBeCloseTo(0.8)
    expect(weightOf(d)).toBeCloseTo(2.6)
  })

  it('Мало попыток: 2 ошибки из 2 — трудность 0,5', () => {
    expect(difficulty(item({ attempts: 2, clean: 0, errors: 2 }), null)).toBe(0.5)
    expect(difficulty(undefined, null)).toBe(0.5)
  })

  it('замедленность: вдвое медленнее медианы — 1, быстрее — 0', () => {
    expect(difficulty(item({ timeCount: 5, avgMs: 2000 }), 1000)).toBe(1)
    expect(difficulty(item({ timeCount: 5, avgMs: 1500 }), 1000)).toBeCloseTo(0.5)
    expect(difficulty(item({ timeCount: 5, avgMs: 800 }), 1000)).toBe(0)
  })

  it('медиана — только по местам со временем, нужно не меньше 3', () => {
    expect(
      medianAvg([item({ timeCount: 1, avgMs: 100 }), item({ timeCount: 1, avgMs: 300 })]),
    ).toBeNull()
    expect(
      medianAvg([
        item({ timeCount: 1, avgMs: 100 }),
        item({ timeCount: 1, avgMs: 300 }),
        item({ timeCount: 1, avgMs: 900 }),
        item({}),
      ]),
    ).toBe(300)
  })

  it('медиана нот и интервалов — отдельно', () => {
    const events: StatEvent[] = []
    for (const pitch of [60, 62, 64]) {
      for (let i = 0; i < 3; i++)
        events.push({ kind: 'note', key: `treble:${pitch}`, outcome: 'clean', ms: 1000 })
    }
    for (const key of ['up2', 'up3', 'down2'] as const) {
      for (let i = 0; i < 3; i++)
        events.push({ kind: 'interval', key, outcome: 'clean', ms: key === 'up2' ? 8000 : 4000 })
    }
    const weights = weightsFor(aggregate(events))
    // Ноты по 1 с — все на медиане; интервал 8 с вдвое медленнее медианы интервалов (4 с).
    expect(weights.note('treble', 60)).toBe(1)
    expect(weights.interval(2, 'up')).toBe(3)
    expect(weights.interval(3, 'up')).toBe(1)
  })

  it('без статистики все веса равны', () => {
    const weights = weightsFor(emptyModeStats())
    expect(weights.note('bass', 40)).toBe(weights.note('treble', 81))
    expect(weights.interval(8, 'down')).toBe(weights.interval(2, 'up'))
  })
})

describe('Взвешенный выбор', () => {
  it('при равных весах совпадает с floor(r × n)', () => {
    const options = [10, 20, 30, 40, 50, 60, 70]
    for (const r of [0, 0.1, 0.3333, 0.5, 0.7142857, 0.99999]) {
      expect(
        weightedPick(
          options,
          () => 2,
          () => r,
        ),
      ).toBe(options[Math.floor(r * options.length)])
    }
  })

  it('вес 3 против 1 — примерно втрое чаще', () => {
    let seed = 1
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 10_000; i++)
      counts[weightedPick(['a', 'b'] as const, (o) => (o === 'a' ? 3 : 1), random)]++
    expect(counts.a / counts.b).toBeGreaterThan(2.25)
    expect(counts.a / counts.b).toBeLessThan(3.75)
  })
})

describe('Вес фигуры «Ритма» (C-STF-6, OB-4)', () => {
  it('по доле ошибок; без статистики — средний', () => {
    const figure = (outcome: 'clean' | 'error'): StatEvent => ({
      kind: 'figure',
      key: 'eighths',
      outcome,
      ms: null,
    })
    const stats = aggregate([figure('error'), figure('error'), figure('error')])
    const weight = figureWeights(stats)
    expect(weight('eighths')).toBe(3)
    expect(weight('quarter')).toBe(2)
    expect(
      figureWeights(aggregate([figure('clean'), figure('clean'), figure('clean')]))('eighths'),
    ).toBe(1)
  })
})
