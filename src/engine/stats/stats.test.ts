import { describe, expect, it } from 'vitest'
import {
  aggregate,
  applyEvents,
  AVERAGE_WINDOW,
  emptyModeStats,
  hasProgress,
  readPracticeStats,
  type StatEvent,
} from './stats'

const note = (outcome: StatEvent['outcome'], ms: number | null = null): StatEvent => ({
  kind: 'note',
  key: 'treble:64',
  outcome,
  ms,
})

describe('Статистика', () => {
  it('пропуск хранится отдельно от ошибок', () => {
    const stats = applyEvents(emptyModeStats(), [note('clean', 1000), note('error'), note('skip')])
    expect(stats.notes['treble:64']).toEqual({
      attempts: 3,
      clean: 1,
      errors: 1,
      skips: 1,
      timeCount: 1,
      avgMs: 1000,
    })
    expect(stats.intervals).toEqual({})
  })

  it(`среднее первых ${AVERAGE_WINDOW} времён точное, дальше свежие весят больше`, () => {
    const first = Array.from({ length: AVERAGE_WINDOW }, (_, i) => note('clean', (i + 1) * 100))
    const stats = applyEvents(emptyModeStats(), first)
    expect(stats.notes['treble:64'].avgMs).toBeCloseTo(1050) // среднее 100…2000
    const later = applyEvents(stats, [note('clean', 3050)])
    expect(later.notes['treble:64'].avgMs).toBeCloseTo(1050 + 2000 / AVERAGE_WINDOW)
  })

  it('исходная статистика не меняется', () => {
    const before = emptyModeStats()
    applyEvents(before, [note('clean', 500)])
    expect(before).toEqual(emptyModeStats())
    expect(hasProgress(before)).toBe(false)
    expect(hasProgress(aggregate([note('skip')]))).toBe(true)
  })

  it('интервалы копятся отдельно от нот', () => {
    const stats = aggregate([{ kind: 'interval', key: 'up3', outcome: 'error', ms: null }])
    expect(stats.intervals.up3.errors).toBe(1)
    expect(stats.notes).toEqual({})
  })
})

describe('Сохранённая статистика', () => {
  const valid = aggregate([note('clean', 700)])

  it('корректные данные читаются', () => {
    const contour = aggregate([{ kind: 'interval', key: 'same1', outcome: 'clean', ms: 600 }])
    expect(readPracticeStats({ sequences: valid, contour, warmup: valid })).toEqual({
      sequences: valid,
      contour,
      warmup: valid,
    })
  })

  it('повреждённый режим — пустой, другой режим не тронут', () => {
    const broken = { notes: { 'treble:64': { attempts: 1, clean: 5 } } }
    expect(readPracticeStats({ sequences: broken, warmup: valid })).toEqual({
      sequences: emptyModeStats(),
      contour: emptyModeStats(),
      warmup: valid,
    })
    expect(
      readPracticeStats({ sequences: { notes: { 'alto:60': valid.notes['treble:64'] } } })
        .sequences,
    ).toEqual(emptyModeStats())
  })

  it('мусор и отсутствие данных — пустая статистика', () => {
    expect(readPracticeStats(undefined)).toEqual({
      sequences: emptyModeStats(),
      contour: emptyModeStats(),
      warmup: emptyModeStats(),
    })
    expect(readPracticeStats('мусор').warmup).toEqual(emptyModeStats())
  })
})

describe('Прогресс по нотам или переходам (C-STF-5)', () => {
  it('у «Контура» нот нет — прогресс есть по переходам', () => {
    expect(
      hasProgress(aggregate([{ kind: 'interval', key: 'down2', outcome: 'skip', ms: null }])),
    ).toBe(true)
  })
})
