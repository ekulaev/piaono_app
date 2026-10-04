import { describe, expect, it } from 'vitest'
import {
  ALL_DURATION_TASK_TYPES,
  isDurationTaskType,
  pairOf,
  parseDurationTaskType,
} from './durations'
import { DURATION_KEYMAP } from './keymap'
import { valueOfKey } from '../check'

describe('Типы заданий «Длительностей» (C-SOL-3, OB-12)', () => {
  it('12 типов: 5 нот, 5 пауз, группы только у восьмых и шестнадцатых', () => {
    expect(ALL_DURATION_TASK_TYPES).toHaveLength(12)
    const groups = ALL_DURATION_TASK_TYPES.filter((t) => t.startsWith('group:'))
    expect(groups).toEqual(['group:8', 'group:16'])
    expect(parseDurationTaskType('rest:h')).toEqual({ kind: 'rest', duration: 'h' })
  })

  it('ключи статистики: свои принимаются, чужие нет', () => {
    expect(isDurationTaskType('group:16')).toBe(true)
    expect(isDurationTaskType('group:q')).toBe(false)
    expect(isDurationTaskType('play:up:m3')).toBe(false)
  })

  it('коварные пары (приложение Г)', () => {
    expect(pairOf('rest:w')).toBe('rest:h')
    expect(pairOf('rest:h')).toBe('rest:w')
    expect(pairOf('note:16')).toBe('note:8')
    expect(pairOf('group:8')).toBe('group:16')
    expect(pairOf('rest:16')).toBe('rest:8')
    expect(pairOf('note:w')).toBeNull()
    expect(pairOf('rest:q')).toBeNull()
  })
})

describe('Таблица «клавиша → длительность» (OB-6)', () => {
  it('до–соль в любой октаве; ля, си и чёрные — нет в таблице', () => {
    expect(valueOfKey(DURATION_KEYMAP, 48)).toBe('w') // C3
    expect(valueOfKey(DURATION_KEYMAP, 74)).toBe('h') // D5
    expect(valueOfKey(DURATION_KEYMAP, 28)).toBe('q') // E1
    expect(valueOfKey(DURATION_KEYMAP, 41)).toBe('8') // F2
    expect(valueOfKey(DURATION_KEYMAP, 67)).toBe('16') // G4
    for (const pitch of [69, 71, 61, 66, 70]) expect(valueOfKey(DURATION_KEYMAP, pitch)).toBeNull()
  })
})
