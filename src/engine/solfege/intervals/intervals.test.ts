import { describe, expect, it } from 'vitest'
import { naturalPitch, stepLetter, stepOf, LETTERS } from '../../warmup/steps'
import { ALL_TASK_TYPES, INTERVALS, isIntervalTaskType, parseTaskType, taskType } from './intervals'
import { INTERVAL_KEYMAP } from './keymap'
import { spellSecond } from './spell'

describe('Таблица «клавиша → интервал» (C-SOL-2, OB-6, приложение Г)', () => {
  it('расстояние от «до» в полутонах — интервал; «до» — октава', () => {
    expect(INTERVAL_KEYMAP).toEqual({
      0: 'P8',
      1: 'm2',
      2: 'M2',
      3: 'm3',
      4: 'M3',
      5: 'P4',
      6: 'TT',
      7: 'P5',
      8: 'm6',
      9: 'M6',
      10: 'm7',
      11: 'M7',
    })
  })
})

describe('Типы заданий (C-SOL-2, OB-12)', () => {
  it('48 типов: вариант, направление, интервал', () => {
    expect(ALL_TASK_TYPES).toHaveLength(48)
    expect(new Set(ALL_TASK_TYPES).size).toBe(48)
    expect(taskType('name', 'down', 'TT')).toBe('name:down:TT')
    expect(parseTaskType('play:up:m3')).toEqual({ variant: 'play', direction: 'up', id: 'm3' })
    expect(isIntervalTaskType('play:up:A4')).toBe(false)
    expect(isIntervalTaskType('sing:up:m3')).toBe(false)
  })
})

describe('Запись второй ноты (C-SOL-2, OB-5)', () => {
  // Полный перебор: 7 белых нот × 12 интервалов × 2 направления.
  const whites = LETTERS.map((letter) => stepOf(letter, 4))

  for (const firstStep of whites) {
    for (const { id, semitones, steps } of INTERVALS) {
      for (const direction of ['up', 'down'] as const) {
        it(`${stepLetter(firstStep)}4 ${id} ${direction}`, () => {
          const sign = direction === 'up' ? 1 : -1
          const second = spellSecond(firstStep, id, direction)
          expect(second.pitch).toBe(naturalPitch(firstStep) + sign * semitones)
          expect(naturalPitch(second.step) + second.accidental).toBe(second.pitch)
          const distance = Math.abs(second.step - firstStep)
          if (id === 'TT') expect([3, 4]).toContain(distance)
          else expect(distance).toBe(steps)
          expect(Math.abs(second.accidental)).toBeLessThanOrEqual(1)
        })
      }
    }
  }

  it('м3 от до — ми♭, а не ре♯', () => {
    expect(spellSecond(stepOf('C', 4), 'm3', 'up')).toEqual({
      step: stepOf('E', 4),
      accidental: -1,
      pitch: 63,
    })
  })

  it('тритон от фа вверх — си, от си вверх — фа, оба без знака', () => {
    expect(spellSecond(stepOf('F', 4), 'TT', 'up')).toMatchObject({
      step: stepOf('B', 4),
      accidental: 0,
    })
    expect(spellSecond(stepOf('B', 4), 'TT', 'up')).toMatchObject({
      step: stepOf('F', 5),
      accidental: 0,
    })
  })
})
