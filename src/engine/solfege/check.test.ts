import { describe, expect, it } from 'vitest'
import { evaluateLong, isSameNote, valueOfKey } from './check'

describe('Проверка ответа (C-SOL-1, OB-3…OB-6)', () => {
  it('ответ-нота: та же высота с октавой', () => {
    expect(isSameNote(72, 72)).toBe(true)
    // Нарисована C5, сыграна C4 — неверно.
    expect(isSameNote(72, 60)).toBe(false)
    // E♭4 и D♯4 — одна клавиша.
    expect(isSameNote(63, 63)).toBe(true)
  })

  it('ответ-значение: по таблице в любой октаве, клавиши вне таблицы — null', () => {
    const table = { 4: 'M3', 6: 'TT' }
    expect(valueOfKey(table, 40)).toBe('M3') // E2
    expect(valueOfKey(table, 88)).toBe('M3') // E6
    expect(valueOfKey(table, 66)).toBe('TT')
    expect(valueOfKey(table, 62)).toBeNull()
  })

  it('длинный ответ: каждая нота на своём месте', () => {
    expect(evaluateLong([60, 62, 64], [60, 61, 64])).toEqual([true, false, true])
    expect(evaluateLong([60, 62], [60, 62])).toEqual([true, true])
  })
})
