import { describe, expect, it } from 'vitest'
import { improvements } from './improvements'
import { aggregate, emptyModeStats, type StatEvent } from './stats'

const repeat = (n: number, event: StatEvent) => Array.from({ length: n }, () => event)
const bassC3 = (outcome: StatEvent['outcome'], ms: number | null = null): StatEvent => ({
  kind: 'note',
  key: 'bass:48',
  outcome,
  ms,
})

describe('Что улучшилось', () => {
  it('Первая сессия: истории не было', () => {
    expect(improvements(emptyModeStats(), aggregate([bassC3('clean', 900)]))).toEqual({
      firstSession: true,
    })
  })

  it('Нота стала точнее: 60 % → 100 %, у басовой — «(бас)»', () => {
    const before = aggregate([...repeat(3, bassC3('clean')), ...repeat(2, bassC3('error'))])
    const session = aggregate(repeat(4, bassC3('clean')))
    expect(improvements(before, session)).toEqual({
      firstSession: false,
      lines: ['C3 (бас) — точнее: 60 % → 100 %'],
    })
  })

  it('интервал стал быстрее', () => {
    const up3 = (ms: number): StatEvent => ({ kind: 'interval', key: 'up3', outcome: 'clean', ms })
    const before = aggregate([...repeat(3, up3(2100)), bassC3('clean')])
    const session = aggregate(repeat(3, up3(1400)))
    expect(improvements(before, session)).toEqual({
      firstSession: false,
      lines: ['↑3 — быстрее: 2,1 с → 1,4 с'],
    })
  })

  it('нет изменений: мало попыток или прирост меньше порога', () => {
    const before = aggregate([...repeat(5, bassC3('clean')), bassC3('error')]) // 83 %
    const none = { firstSession: false, lines: [] }
    // 83 % → 100 % — меньше порога в 20 пунктов.
    expect(improvements(before, aggregate(repeat(4, bassC3('clean'))))).toEqual(none)
    // Две попытки в сессии — меньше минимума.
    const weak = aggregate([...repeat(1, bassC3('clean')), ...repeat(3, bassC3('error'))])
    expect(improvements(weak, aggregate(repeat(2, bassC3('clean'))))).toEqual(none)
  })

  it('не больше трёх строк, по величине улучшения', () => {
    const events: StatEvent[] = []
    const session: StatEvent[] = []
    ;[60, 62, 64, 65].forEach((pitch, i) => {
      const key = `treble:${pitch}` as const
      events.push(...repeat(3 + i, { kind: 'note', key, outcome: 'clean', ms: null }))
      events.push(...repeat(3, { kind: 'note', key, outcome: 'error', ms: null }))
      session.push(...repeat(3, { kind: 'note', key, outcome: 'clean', ms: null }))
    })
    const result = improvements(aggregate(events), aggregate(session))
    if (result.firstSession) throw new Error('ожидалась история')
    expect(result.lines).toHaveLength(3)
    expect(result.lines[0]).toBe('C4 — точнее: 50 % → 100 %')
  })
})

describe('«Что улучшилось» в «Контуре» (C-STF-5)', () => {
  const same = (outcome: StatEvent['outcome']): StatEvent => ({
    kind: 'interval',
    key: 'same1',
    outcome,
    ms: null,
  })

  it('Вторая сессия Контура: история из одних переходов — не первая сессия, «=» в строке', () => {
    const before = aggregate([...repeat(2, same('clean')), ...repeat(3, same('error'))])
    const result = improvements(before, aggregate(repeat(4, same('clean'))))
    expect(result).toEqual({ firstSession: false, lines: ['= — точнее: 40 % → 100 %'] })
  })
})
