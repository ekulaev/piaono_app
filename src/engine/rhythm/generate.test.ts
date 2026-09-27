import { describe, expect, it } from 'vitest'
import { FIGURES, figureTicks, LEVELS, TICKS_PER_BEAT, type RhythmLevel } from './figures'
import { generatePattern, MIN_NOTES, notesOf, patternFigures, type Meter } from './generate'

/** Повторяемый генератор случайных чисел для тестов. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

const uniform = () => 1

describe('Генератор (C-STF-6, OB-4)', () => {
  it('1000 рисунков на каждое сочетание: такты ровные, фигуры уровня, первая доля — нота', () => {
    const random = seeded(7)
    for (const level of [1, 2, 3, 4] as RhythmLevel[]) {
      for (const meter of [3, 4] as Meter[]) {
        for (const bars of [1, 2]) {
          for (let i = 0; i < 1000; i++) {
            const pattern = generatePattern(level, meter, bars, uniform, random)
            expect(pattern.bars).toHaveLength(bars)
            for (const bar of pattern.bars) {
              const ticks = bar.reduce((sum, id) => sum + figureTicks(id), 0)
              expect(ticks).toBe(meter * TICKS_PER_BEAT)
              for (const id of bar) expect(LEVELS[level]).toContain(id)
            }
            expect(FIGURES[pattern.bars[0][0]].items[0].rest).toBe(false)
            expect(pattern.notes[0].at).toBe(0)
            expect(pattern.notes.length).toBeGreaterThanOrEqual(MIN_NOTES)
          }
        }
      }
    }
  })

  it('трудная фигура выпадает примерно в 3 раза чаще лёгкой (±25 %)', () => {
    const random = seeded(11)
    const counts = { half: 0, quarter: 0 }
    const weight = (id: string) => (id === 'half' ? 3 : 1)
    for (let i = 0; i < 4000; i++) {
      // Первая фигура 2 тактов 4/4: выбор из двух, и рисунок никогда не строится заново
      // (даже из одних половинных выходит 4 ноты).
      const first = generatePattern(1, 4, 2, weight, random).bars[0][0]
      counts[first as 'half' | 'quarter']++
    }
    const ratio = counts.half / counts.quarter
    expect(ratio).toBeGreaterThan(3 * 0.75)
    expect(ratio).toBeLessThan(3 * 1.25)
  })

  it('ноты — в местах начала, паузы пропущены', () => {
    const notes = notesOf([['quarter', 'quarter-rest', 'eighths']])
    expect(notes).toEqual([
      { at: 0, ticks: 2, figure: 0 },
      { at: 4, ticks: 1, figure: 2 },
      { at: 5, ticks: 1, figure: 2 },
    ])
    expect(patternFigures({ meter: 3, bars: [['half'], ['quarter']], notes: [] })).toEqual([
      'half',
      'quarter',
    ])
  })
})
