import { describe, expect, it } from 'vitest'
import { pickTypes } from './pick'

describe('Выбор типов заданий (C-SOL-1, OB-2)', () => {
  it('подряд один тип не повторяется', () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const picked = pickTypes(500, ['a', 'b', 'c'], () => 1, random)
    for (let i = 1; i < picked.length; i++) expect(picked[i]).not.toBe(picked[i - 1])
  })

  it('трудный тип выпадает чаще', () => {
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const types = ['hard', 'b', 'c', 'd', 'e', 'f']
    const picked = pickTypes(6000, types, (t) => (t === 'hard' ? 3 : 1), random)
    const hard = picked.filter((t) => t === 'hard').length
    const easy = picked.filter((t) => t === 'b').length
    expect(hard / easy).toBeGreaterThan(2)
  })
})
