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
    const rhythm = aggregate([{ kind: 'figure', key: 'eighths', outcome: 'error', ms: null }])
    expect(readPracticeStats({ sequences: valid, contour, rhythm, warmup: valid })).toEqual({
      sequences: valid,
      contour,
      rhythm,
      warmup: valid,
      intervals: emptyModeStats(),
    })
  })

  it('повреждённый режим — пустой, другой режим не тронут', () => {
    const broken = { notes: { 'treble:64': { attempts: 1, clean: 5 } } }
    expect(readPracticeStats({ sequences: broken, warmup: valid })).toEqual({
      sequences: emptyModeStats(),
      contour: emptyModeStats(),
      rhythm: emptyModeStats(),
      warmup: valid,
      intervals: emptyModeStats(),
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
      rhythm: emptyModeStats(),
      warmup: emptyModeStats(),
      intervals: emptyModeStats(),
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

describe('Фигуры «Ритма» (C-STF-6)', () => {
  const figure = (key: StatEvent['key'], outcome: StatEvent['outcome']): StatEvent => ({
    kind: 'figure',
    key,
    outcome,
    ms: null,
  })

  it('фигуры копятся своей таблицей, без времени', () => {
    const stats = aggregate([figure('eighths', 'clean'), figure('eighths', 'error')])
    expect(stats.figures.eighths).toEqual({
      attempts: 2,
      clean: 1,
      errors: 1,
      skips: 0,
      timeCount: 0,
      avgMs: 0,
    })
    expect(stats.notes).toEqual({})
    expect(stats.intervals).toEqual({})
    expect(hasProgress(stats)).toBe(true)
  })

  it('записи до «Ритма» без таблицы фигур читаются, фигуры пустые', () => {
    const old = { notes: { 'treble:64': aggregate([note('clean', 700)]).notes['treble:64'] } }
    const read = readPracticeStats({ sequences: old })
    expect(read.sequences.notes['treble:64'].clean).toBe(1)
    expect(read.sequences.figures).toEqual({})
    expect(read.rhythm).toEqual(emptyModeStats())
  })

  it('неизвестная фигура — режим «Ритм» пустой, другие не тронуты', () => {
    const valid = aggregate([note('clean', 700)])
    const read = readPracticeStats({
      sequences: valid,
      rhythm: { notes: {}, figures: { triplet: valid.notes['treble:64'] } },
    })
    expect(read.rhythm).toEqual(emptyModeStats())
    expect(read.sequences).toEqual(valid)
  })
})

describe('Типы заданий сольфеджио (C-SOL-1, OB-16; C-SOL-2, OB-12)', () => {
  const task = (
    key: string,
    outcome: StatEvent['outcome'],
    ms: number | null = null,
  ): StatEvent => ({
    kind: 'task',
    key,
    outcome,
    ms,
  })

  it('задания копятся своей таблицей: чисто, после ошибок, пропуск', () => {
    const stats = aggregate([
      task('name:up:TT', 'clean', 2400),
      task('name:up:TT', 'error'),
      task('play:down:m3', 'skip'),
    ])
    expect(stats.tasks['name:up:TT']).toEqual({
      attempts: 2,
      clean: 1,
      errors: 1,
      skips: 0,
      timeCount: 1,
      avgMs: 2400,
    })
    expect(stats.tasks['play:down:m3'].skips).toBe(1)
    expect(stats.notes).toEqual({})
    expect(hasProgress(stats)).toBe(true)
  })

  it('«Интервалы» читаются рядом с прежними режимами', () => {
    const intervals = aggregate([task('play:up:M3', 'clean', 1500)])
    const read = readPracticeStats({ intervals })
    expect(read.intervals).toEqual(intervals)
    expect(read.warmup).toEqual(emptyModeStats())
  })

  it('старая запись без «Интервалов» и без таблицы заданий читается без потерь', () => {
    const old = { notes: { 'treble:64': aggregate([note('clean', 700)]).notes['treble:64'] } }
    const read = readPracticeStats({ warmup: old })
    expect(read.warmup.notes['treble:64'].clean).toBe(1)
    expect(read.warmup.tasks).toEqual({})
    expect(read.intervals).toEqual(emptyModeStats())
  })

  it('неизвестный тип задания — «Интервалы» пустые, другие режимы не тронуты', () => {
    const valid = aggregate([note('clean', 700)])
    const item = aggregate([task('name:up:TT', 'clean', 1000)]).tasks['name:up:TT']
    const read = readPracticeStats({
      warmup: valid,
      intervals: { notes: {}, tasks: { 'name:up:A4': item } },
    })
    expect(read.intervals).toEqual(emptyModeStats())
    expect(read.warmup).toEqual(valid)
  })
})
