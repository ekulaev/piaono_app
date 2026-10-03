import { describe, expect, it } from 'vitest'
import { aggregate, emptyModeStats } from '../stats/stats'
import type { FigureId } from './figures'
import { notesOf, type Pattern } from './generate'
import {
  CHORD_MS,
  next,
  repeat,
  restart,
  rhythmEvents,
  skip,
  startRhythm,
  summarizeRhythm,
  tap,
  type RhythmState,
} from './session'

const pattern = (bars: FigureId[][]): Pattern => ({ meter: 4, bars, notes: notesOf(bars) })
/** Четверть, две восьмые, половинная: 4 удара. */
const mixed = pattern([['quarter', 'eighths', 'half']])
/** Ровные удары: восьмая — 250 мс. */
const evenTaps = (p: Pattern, start = 1000) => p.notes.map((note) => start + note.at * 250)

function play(state: RhythmState, taps: number[]) {
  return taps.reduce(tap, state)
}

describe('Автомат «Ритма» (C-STF-6)', () => {
  it('удары идут по нотам, последний — оценка', () => {
    let state = startRhythm([mixed])
    expect(state.phase).toBe('ready')
    state = play(state, evenTaps(mixed).slice(0, 3))
    expect(state.phase === 'tapping' && state.taps).toHaveLength(3)
    state = tap(state, evenTaps(mixed)[3])
    expect(state.phase === 'evaluated' && state.marks).toEqual([
      'onTime',
      'onTime',
      'onTime',
      'onTime',
    ])
  })

  it('Аккорд — один удар: нажатие через 20 мс не считается', () => {
    let state = startRhythm([mixed])
    state = play(state, [1000, 1020])
    expect(state.phase === 'tapping' && state.taps).toEqual([1000])
    state = tap(state, 1000 + CHORD_MS)
    expect(state.phase === 'tapping' && state.taps).toEqual([1000, 1050])
  })

  it('Сначала: удары сброшены, первая нота снова текущая, попытка не записана', () => {
    let state = startRhythm([mixed], emptyModeStats())
    state = play(state, evenTaps(mixed).slice(0, 3))
    state = restart(state)
    expect(state.phase).toBe('ready')
    expect(state.phase === 'ready' && state.stats?.events).toEqual([])
    // «Сначала» есть только после первого удара.
    expect(restart(state)).toBe(state)
  })

  it('Ещё раз: удар после оценки начинает новую попытку того же рисунка', () => {
    let state = play(startRhythm([mixed]), evenTaps(mixed))
    state = tap(state, 9000)
    expect(state.phase).toBe('tapping')
    expect(state.phase === 'tapping' && state.taps).toEqual([9000])
    expect(state.phase === 'tapping' && state.index).toBe(0)
    expect(state.phase === 'tapping' && state.attempts).toHaveLength(1)
  })

  it('удар сразу после последнего (аккорд) не начинает новую попытку', () => {
    const taps = evenTaps(mixed)
    const state = play(startRhythm([mixed]), taps)
    expect(tap(state, taps[3] + 10)).toBe(state)
  })

  it('Пропустить — только до первого удара; пропущенный рисунок без статистики', () => {
    let state = startRhythm([mixed, mixed], emptyModeStats())
    state = skip(state)
    expect(state.phase === 'ready' && state.index).toBe(1)
    const tapping = tap(state, 1000)
    expect(skip(tapping)).toBe(tapping)
    expect(state.phase === 'ready' && state.stats?.events).toEqual([])
  })

  it('Далее: следующий рисунок, после последнего — итог', () => {
    let state = play(startRhythm([mixed, mixed]), evenTaps(mixed))
    state = next(state)
    expect(state.phase === 'ready' && state.index).toBe(1)
    state = next(play(state, evenTaps(mixed, 5000)))
    expect(state.phase).toBe('summary')
  })

  it('Фигура с ошибкой: вторая восьмая поздно — у «двух восьмых» ошибка, у остальных чисто', () => {
    expect(rhythmEvents(mixed, ['onTime', 'onTime', 'late', 'onTime'])).toEqual([
      { kind: 'figure', key: 'quarter', outcome: 'clean', ms: null },
      { kind: 'figure', key: 'eighths', outcome: 'error', ms: null },
      { kind: 'figure', key: 'half', outcome: 'clean', ms: null },
    ])
  })

  it('пауза в статистику не попадает', () => {
    const withRest = pattern([['quarter', 'quarter-rest', 'half']])
    expect(rhythmEvents(withRest, ['onTime', 'onTime']).map((e) => e.key)).toEqual([
      'quarter',
      'half',
    ])
  })

  it('каждая оценённая попытка пишется в статистику сессии', () => {
    let state = play(startRhythm([mixed], emptyModeStats()), evenTaps(mixed))
    state = play(state, evenTaps(mixed, 9000))
    expect(state.phase === 'evaluated' && state.stats?.events).toHaveLength(6)
  })

  it('Повторить: те же рисунки, история включает прошлую сессию', () => {
    let state = play(startRhythm([mixed], emptyModeStats()), evenTaps(mixed))
    state = repeat(next(state))
    expect(state.phase === 'ready' && state.patterns).toEqual([mixed])
    expect(state.phase === 'ready' && state.stats?.before.figures.quarter?.clean).toBe(1)
  })
})

describe('Итог «Ритма» (OB-12)', () => {
  it('Итог: первый рисунок чисто с первой попытки, второй — со второй', () => {
    const quarters = pattern([['quarter', 'quarter', 'quarter', 'quarter']])
    const late = evenTaps(quarters)
    late[2] += 300
    let state = play(startRhythm([mixed, quarters]), evenTaps(mixed))
    state = next(state)
    state = play(state, late)
    state = play(state, evenTaps(quarters, 9000))
    state = next(state)
    expect(state.phase).toBe('summary')
    if (state.phase !== 'summary') return
    expect(summarizeRhythm(state.patterns, state.history)).toEqual({
      cleanFirstTry: 1,
      attempts: 3,
      onTimeShare: 11 / 12,
      early: 0,
      late: 1,
      hardest: [{ id: 'quarter', errors: 1, attempts: 9 }],
    })
  })

  it('всё чисто — трудных фигур нет; ничего не оценено — доли нет', () => {
    const state = next(play(startRhythm([mixed]), evenTaps(mixed)))
    if (state.phase !== 'summary') throw new Error('ожидался итог')
    expect(summarizeRhythm(state.patterns, state.history).hardest).toEqual([])
    const skipped = skip(startRhythm([mixed]))
    if (skipped.phase !== 'summary') throw new Error('ожидался итог')
    expect(summarizeRhythm(skipped.patterns, skipped.history)).toMatchObject({
      attempts: 0,
      onTimeShare: null,
    })
  })

  it('статистика сессии сворачивается в таблицу фигур', () => {
    const state = play(startRhythm([mixed], emptyModeStats()), evenTaps(mixed))
    if (state.phase !== 'evaluated' || !state.stats) throw new Error('ожидалась оценка')
    expect(Object.keys(aggregate(state.stats.events).figures).sort()).toEqual([
      'eighths',
      'half',
      'quarter',
    ])
  })
})
