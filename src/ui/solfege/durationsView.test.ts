import { describe, expect, it } from 'vitest'
import { buildDurationTask } from '../../engine/solfege/durations/generate'
import * as session from '../../engine/solfege/session'
import { emptyModeStats } from '../../engine/stats/stats'
import { DURATION_LEGEND, durationKeyMarks, durationSign } from './durationsView'

const random = () => 0.3

function asking(type: Parameters<typeof buildDurationTask>[0]) {
  const state = session.startSession([buildDurationTask(type, random)], false, emptyModeStats(), 0)
  if (state.phase !== 'asking') throw new Error('нет задания')
  return state
}

describe('Вид задания «Длительностей» (C-SOL-3, OB-7, OB-9, OB-10)', () => {
  it('легенда: до–соль, значок ноты и дробь; ля, си, чёрных нет', () => {
    expect(Object.keys(DURATION_LEGEND).map(Number)).toEqual([0, 2, 4, 5, 7])
    expect(DURATION_LEGEND[5]).toEqual({ glyph: '', text: '1/8' })
  })

  it('неверная клавиша таблицы — красная; знак обычный', () => {
    const state = session.press(asking('rest:h'), 67, 100) // G4 — 1/16
    if (state.phase !== 'asking') throw new Error('задание должно остаться')
    expect(durationKeyMarks(state).get(67)).toBe('wrong')
    expect(durationSign(state).look).toBe('normal')
  })

  it('верный ответ — знак в кольце, все «ре» зелёные', () => {
    const state = session.press(asking('rest:h'), 50, 100) // D3
    if (state.phase !== 'done') throw new Error('задание должно завершиться')
    const marks = durationKeyMarks(state)
    expect(durationSign(state)).toMatchObject({ kind: 'rest', duration: 'h', look: 'correct' })
    for (const pitch of [26, 38, 50, 62, 74, 86, 98]) expect(marks.get(pitch)).toBe('correct')
    expect(marks.get(60)).toBeUndefined()
  })

  it('пропуск после ошибки — знак в рамке, ошибка остаётся красной', () => {
    const wrong = session.press(asking('group:8'), 60, 100) // C4 — целая
    const state = session.skip(wrong, 200)
    if (state.phase !== 'done') throw new Error('задание должно завершиться')
    expect(durationSign(state).look).toBe('answer')
    expect(durationKeyMarks(state).get(60)).toBe('wrong')
    expect(durationKeyMarks(state).get(65)).toBe('correct')
  })

  it('ля, си и чёрные — без реакции', () => {
    const state = session.press(asking('note:q'), 69, 100)
    expect(state.phase).toBe('asking')
    if (state.phase === 'asking') expect(durationKeyMarks(state).size).toBe(0)
  })
})
