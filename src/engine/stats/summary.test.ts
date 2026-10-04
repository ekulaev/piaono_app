import { describe, expect, it } from 'vitest'
import { aggregate, emptyModeStats, type ItemStats, type ModeStats } from './stats'
import { summarizeMode } from './summary'

const item = (attempts: number, clean: number, avgMs = 0, timeCount = 0): ItemStats => ({
  attempts,
  clean,
  errors: attempts - clean,
  skips: 0,
  timeCount,
  avgMs,
})
const stats = (part: Partial<ModeStats>): ModeStats => ({ ...emptyModeStats(), ...part })

describe('Сводка режима (C-STF-7)', () => {
  it('Трудные ноты: меньше 3 попыток и лёгкие не попадают', () => {
    const s = summarizeMode(
      'warmup',
      stats({
        notes: {
          'bass:53': item(12, 5, 1000, 5),
          'treble:60': item(2, 0),
          'treble:64': item(10, 10, 1000, 10),
          'treble:67': item(4, 4, 1000, 4),
        },
      }),
    )!
    expect(s.lists).toHaveLength(1)
    expect(s.lists[0].id).toBe('notes')
    expect(s.lists[0].places.map((p) => p.key)).toEqual(['bass:53'])
    expect(s.lists[0].places[0].cleanShare).toBeCloseTo(5 / 12)
    expect(s.attempts).toBe(28)
    expect(s.avgMs).toBe(1000)
  })

  it('Ритм без времени', () => {
    const s = summarizeMode('rhythm', stats({ figures: { eighths: item(5, 2) } }))!
    expect(s.avgMs).toBeNull()
    expect(s.lists[0].places).toEqual([
      { kind: 'figure', key: 'eighths', attempts: 5, cleanShare: 0.4, avgMs: null },
    ])
  })

  it('без статистики — null; пустой список, если трудных нет', () => {
    expect(summarizeMode('contour', emptyModeStats())).toBeNull()
    const s = summarizeMode('contour', stats({ intervals: { up2: item(5, 5) } }))!
    expect(s.lists[0]).toEqual({ id: 'transitions', places: [] })
  })

  it('порядок: трудность, неудачи, подпись; не больше 5', () => {
    const notes: ModeStats['notes'] = {}
    for (const p of [60, 62, 64, 65, 67, 69, 71]) notes[`treble:${p}`] = item(4, 2)
    notes['treble:72'] = item(4, 0)
    const s = summarizeMode('warmup', stats({ notes }))!
    // C5, A4, B4, C4, D4
    expect(s.lists[0].places.map((p) => p.key)).toEqual([
      'treble:72',
      'treble:69',
      'treble:71',
      'treble:60',
      'treble:62',
    ])
  })

  it('«Последовательности» — два списка, числа по нотам', () => {
    const s = summarizeMode(
      'sequences',
      stats({ notes: { 'treble:60': item(3, 1) }, intervals: { up3: item(3, 1) } }),
    )!
    expect(s.lists.map((l) => l.id)).toEqual(['notes', 'intervals'])
    expect(s.attempts).toBe(3)
  })
})

describe('Сводка «Интервалов» (C-SOL-1, OB-18)', () => {
  it('основная таблица — задания, список «Трудные задания»', () => {
    const events = [
      ...Array.from({ length: 4 }, () => ({
        kind: 'task' as const,
        key: 'name:up:TT',
        outcome: 'error' as const,
        ms: null,
      })),
      ...Array.from({ length: 2 }, () => ({
        kind: 'task' as const,
        key: 'name:up:TT',
        outcome: 'clean' as const,
        ms: 2000,
      })),
    ]
    const summary = summarizeMode('intervals', aggregate(events))!
    expect(summary.attempts).toBe(6)
    expect(summary.lists).toEqual([
      {
        id: 'tasks',
        places: [{ kind: 'task', key: 'name:up:TT', attempts: 6, cleanShare: 2 / 6, avgMs: 2000 }],
      },
    ])
  })

  it('без статистики — нет сводки', () => {
    expect(summarizeMode('intervals', emptyModeStats())).toBeNull()
  })
})
