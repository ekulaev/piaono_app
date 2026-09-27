import { describe, expect, it } from 'vitest'
import type { FigureId } from './figures'
import { evaluateTaps, fitTempo } from './evaluate'
import { notesOf, type Pattern } from './generate'

const pattern = (bars: FigureId[][]): Pattern => ({ meter: 4, bars, notes: notesOf(bars) })
/** Удары точно на местах нот при заданной длительности восьмой. */
const exact = (p: Pattern, msPerTick: number, start = 1000) =>
  p.notes.map((note) => start + note.at * msPerTick)

describe('Оценка по темпу ученика (C-STF-6, OB-7)', () => {
  const mixed = pattern([['quarter', 'eighths', 'half']])

  it('Ровно в другом темпе: вдвое медленнее — всё вовремя', () => {
    expect(evaluateTaps(mixed, exact(mixed, 250))).toEqual(['onTime', 'onTime', 'onTime', 'onTime'])
    expect(evaluateTaps(mixed, exact(mixed, 500))).toEqual(['onTime', 'onTime', 'onTime', 'onTime'])
  })

  it('темп подбирается точно по ровным ударам', () => {
    expect(fitTempo([0, 2, 3, 4], [1000, 1500, 1750, 2000])).toEqual({
      start: 1000,
      msPerTick: 250,
    })
  })

  it('Поспешил: нота на треть доли раньше — «рано», остальные вовремя', () => {
    const quarters = pattern([['quarter', 'quarter', 'quarter', 'quarter']])
    const taps = exact(quarters, 300) // доля — 600 мс
    taps[2] -= 200
    expect(evaluateTaps(quarters, taps)).toEqual(['onTime', 'onTime', 'early', 'onTime'])
  })

  it('поздно — удар после своего места', () => {
    const quarters = pattern([['quarter', 'quarter', 'quarter', 'quarter']])
    const taps = exact(quarters, 300)
    taps[1] += 200
    expect(evaluateTaps(quarters, taps)[1]).toBe('late')
  })

  it('допуск — четверть самой короткой длительности рисунка', () => {
    // Самая короткая — восьмая (300 мс), допуск 75 мс; подгонка съедает часть сдвига.
    const withEighths = pattern([['eighths', 'eighths', 'half']])
    const small = exact(withEighths, 300)
    small[1] += 50
    expect(evaluateTaps(withEighths, small)).toEqual([
      'onTime',
      'onTime',
      'onTime',
      'onTime',
      'onTime',
    ])
    const big = exact(withEighths, 300)
    big[1] += 150
    expect(evaluateTaps(withEighths, big)[1]).toBe('late')
    // Тот же сдвиг в рисунке из четвертей (допуск 150 мс) — вовремя.
    const quarters = pattern([['quarter', 'quarter', 'quarter', 'quarter']])
    const taps = exact(quarters, 300)
    taps[1] += 120
    expect(evaluateTaps(quarters, taps)[1]).toBe('onTime')
  })

  it('рисунок с паузой: нота после паузы должна ждать её длительность', () => {
    const withRest = pattern([['quarter', 'quarter-rest', 'quarter', 'quarter']])
    expect(evaluateTaps(withRest, exact(withRest, 300))).toEqual(['onTime', 'onTime', 'onTime'])
    // Ученик не выждал паузу: сыграл как три четверти подряд.
    const rushed = [1000, 1600, 2200]
    expect(evaluateTaps(withRest, rushed)).not.toEqual(['onTime', 'onTime', 'onTime'])
  })

  it('живой разброс ±20 мс в ровной игре — всё вовремя', () => {
    const p = pattern([
      ['eighths', 'quarter', 'eighths', 'quarter'],
      ['dotted', 'half'],
    ])
    const jitter = [12, -18, 5, 20, -7, -20, 15, 0, -11]
    const taps = exact(p, 250).map((t, i) => t + jitter[i])
    expect(evaluateTaps(p, taps).every((mark) => mark === 'onTime')).toBe(true)
  })

  it('одна сбитая нота не сдвигает темп остальных', () => {
    const three = pattern([['quarter', 'quarter', 'half']])
    const taps = exact(three, 300)
    taps[1] -= 200
    expect(evaluateTaps(three, taps)).toEqual(['onTime', 'early', 'onTime'])
  })
})
