// Что показать в задании «Интервалов» (C-SOL-2): ноты на стане, отметки клавиш, куда сдвинуть
// клавиатуру. Чистые функции над состоянием сессии — без React и VexFlow.

import type { KeyMark } from '../keyboard/Keyboard'
import type { KeyboardFocus } from '../keyboard/Keyboard'
import type { IntervalTask } from '../../engine/solfege/intervals/generate'
import { intervalInfo } from '../../engine/solfege/intervals/intervals'
import type { SolfegeState } from '../../engine/solfege/session'
import { stepOf, LETTERS } from '../../engine/warmup/steps'
import type { SolfegeNote } from './solfegeDrawing'

/** Нажатая неверная нота на стане: ступень и диез у чёрной клавиши. */
export function spellPlayed(pitch: number): Pick<SolfegeNote, 'step' | 'accidental'> {
  const pc = pitch % 12
  const naturals = [0, 2, 4, 5, 7, 9, 11]
  const sharp = !naturals.includes(pc)
  const letter = LETTERS[naturals.indexOf(sharp ? pc - 1 : pc)]
  return { step: stepOf(letter, Math.floor(pitch / 12) - 1), accidental: sharp ? 1 : 0 }
}

type Active = Extract<SolfegeState, { phase: 'asking' | 'done' }>

/** Ноты на стане: первая; в «Узнай» — и вторая; результат «Сыграй» — вторая и неверная. */
export function intervalNotes(state: Active): SolfegeNote[] {
  const { content } = state.tasks[state.index] as IntervalTask
  const first: SolfegeNote = { step: content.firstStep, accidental: 0, look: 'normal' }
  const second = { step: content.second.step, accidental: content.second.accidental }
  if (content.variant === 'name') return [first, { ...second, look: 'normal' }]

  const notes = [first]
  if (state.phase === 'done') {
    notes.push({ ...second, look: state.outcome === 'skip' ? 'answer' : 'correct' })
  }
  if (state.wrong) {
    // Неверная нота стоит на месте второй, пока ответа нет, и правее — рядом с ответом.
    notes.push({ ...spellPlayed(state.wrong.pitch), look: 'wrong' })
  }
  return notes
}

/** Отметки клавиш: неверное нажатие — красным, верный или показанный ответ — зелёным. */
export function intervalKeyMarks(state: Active): Map<number, KeyMark> {
  const task = state.tasks[state.index] as IntervalTask
  const marks = new Map<number, KeyMark>()
  if (state.wrong && !(state.phase === 'done' && state.outcome !== 'skip')) {
    marks.set(state.wrong.pitch, 'wrong')
  }
  if (state.phase === 'done') {
    if (task.answer.kind === 'note') {
      for (const pitch of task.answer.pitches) marks.set(pitch, 'correct')
    } else {
      // «Узнай»: зелёные — все клавиши с легендой верного интервала.
      const target = intervalInfo(task.content.interval).semitones % 12
      for (let pitch = 21; pitch <= 108; pitch++)
        if (pitch % 12 === target) marks.set(pitch, 'correct')
    }
  }
  return marks
}

/**
 * Куда сдвинуть клавиатуру на новом задании (C-SOL-2, OB-9, OB-11): «Сыграй вверх» — первая
 * нота слева, «вниз» — справа; «Узнай» — видна целая октава «до–до».
 */
export function intervalFocus(task: IntervalTask): Pick<KeyboardFocus, 'low' | 'high' | 'align'> {
  const { content } = task
  if (content.variant === 'name')
    return { low: task.range.low, high: task.range.high, align: 'octave' }
  return content.direction === 'up'
    ? { low: content.first, high: content.first, align: 'left' }
    : { low: content.first, high: content.first, align: 'right' }
}
