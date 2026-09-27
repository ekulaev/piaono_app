import { describe, expect, it } from 'vitest'
import { FIGURES, figureTicks, LEVELS, TICKS_PER_BEAT, type RhythmLevel } from './figures'

describe('Фигуры и уровни (LIM-1)', () => {
  it('каждый уровень содержит все фигуры предыдущего', () => {
    for (const level of [2, 3, 4] as const) {
      const previous = LEVELS[(level - 1) as RhythmLevel]
      expect(LEVELS[level]).toEqual(expect.arrayContaining([...previous]))
      expect(LEVELS[level].length).toBeGreaterThan(previous.length)
    }
    expect(LEVELS[4]).toEqual(Object.keys(FIGURES))
  })

  it('каждая фигура занимает целое число долей', () => {
    for (const id of LEVELS[4]) expect(figureTicks(id) % TICKS_PER_BEAT).toBe(0)
  })

  it('на каждом уровне есть четверть — из неё всегда собирается 3 ноты', () => {
    for (const level of [1, 2, 3, 4] as const) expect(LEVELS[level]).toContain('quarter')
  })
})
