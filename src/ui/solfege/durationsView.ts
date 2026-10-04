// Что показать в задании «Длительностей» (C-SOL-3): знак на стане, отметки клавиш, легенда.
// Чистые функции над состоянием сессии — без React и VexFlow.

import type { KeyMark, LegendLabel } from '../keyboard/Keyboard'
import { DURATION_FRACTION, type DurationId } from '../../engine/solfege/durations/durations'
import type { DurationTask } from '../../engine/solfege/durations/generate'
import { DURATION_KEYMAP } from '../../engine/solfege/durations/keymap'
import type { SolfegeState } from '../../engine/solfege/session'
import type { DurationSign } from './solfegeDrawing'

type Active = Extract<SolfegeState, { phase: 'asking' | 'done' }>

/** Знак на стане: после ответа — зелёный в кольце, после пропуска — в рамке (OB-10). */
export function durationSign(state: Active): DurationSign {
  const { content } = state.tasks[state.index] as DurationTask
  const look = state.phase === 'done' ? (state.outcome === 'skip' ? 'answer' : 'correct') : 'normal'
  return { kind: content.kind, duration: content.duration, steps: content.steps, look }
}

/** Отметки клавиш: неверное нажатие — красным; верный или показанный ответ — все клавиши этой длительности (OB-9, OB-10). */
export function durationKeyMarks(state: Active): Map<number, KeyMark> {
  const task = state.tasks[state.index] as DurationTask
  const marks = new Map<number, KeyMark>()
  if (state.wrong && !(state.phase === 'done' && state.outcome !== 'skip')) {
    marks.set(state.wrong.pitch, 'wrong')
  }
  if (state.phase === 'done') {
    const target = Number(
      Object.entries(DURATION_KEYMAP).find(([, id]) => id === task.content.duration)![0],
    )
    for (let pitch = 21; pitch <= 108; pitch++)
      if (pitch % 12 === target) marks.set(pitch, 'correct')
  }
  return marks
}

/**
 * Значок ноты в легенде — символ SMuFL нотного шрифта Bravura (NFR-4): в шрифте интерфейса
 * нотных знаков может не быть. Ноты со штилем вверх.
 */
const NOTE_GLYPH: Readonly<Record<DurationId, string>> = {
  w: '',
  h: '',
  q: '',
  '8': '',
  '16': '',
}

/** Легенда над клавишами до–соль: значок ноты и дробь (OB-7). Слов в ней нет — перевод не нужен. */
export const DURATION_LEGEND: Readonly<Record<number, LegendLabel>> = Object.fromEntries(
  Object.entries(DURATION_KEYMAP).map(([pc, id]) => [
    pc,
    { glyph: NOTE_GLYPH[id], text: DURATION_FRACTION[id] },
  ]),
)
