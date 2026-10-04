// Вид режима сольфеджио (C-SOL-1, INV-1): ядро общее, а что нарисовать, какие клавиши отметить,
// куда сдвинуть клавиатуру и что подписать над клавишами — у каждого режима своё. Экран берёт
// вид по режиму задания (INV-5), а не по активному режиму.

import type { KeyboardFocus, KeyMark, LegendLabel } from '../keyboard/Keyboard'
import type { useT } from '../i18n/useI18n'
import {
  DURATION_FRACTION,
  type DurationId,
  type DurationTaskType,
} from '../../engine/solfege/durations/durations'
import type { DurationTask } from '../../engine/solfege/durations/generate'
import { INTERVALS_RANGE, type IntervalTask } from '../../engine/solfege/intervals/generate'
import type { IntervalId } from '../../engine/solfege/intervals/intervals'
import { INTERVAL_KEYMAP } from '../../engine/solfege/intervals/keymap'
import type { SolfegeState } from '../../engine/solfege/session'
import type { PitchRange, SolfegeModeId, Task } from '../../engine/solfege/types'
import type { StaffGeometry } from '../staff/staffDrawing'
import { durationKeyMarks, durationSign, DURATION_LEGEND } from './durationsView'
import { intervalFocus, intervalKeyMarks, intervalNotes } from './intervalsView'
import { drawDurationSign, drawSolfegeStaff } from './solfegeDrawing'

type Translate = ReturnType<typeof useT>
type Active = Extract<SolfegeState, { phase: 'asking' | 'done' }>

/** Строка над станом: формулировка и оценка «✓ / ✗» в той же зоне (C-SOL-1, OB-12). */
export interface TaskPicture {
  prompt: string
  result: { look: 'correct' | 'wrong' | 'answer'; text: string } | null
  /** Ключ рисунка: стан перерисовывается, только когда он меняется. */
  key: string
  draw: (host: HTMLElement, geometry: StaffGeometry) => void
}

export interface SolfegeView {
  picture: (t: Translate, state: Active) => TaskPicture
  marks: (state: Active) => Map<number, KeyMark>
  /** Куда сдвинуть клавиатуру на новом задании; null — не сдвигать. */
  focus: (task: Task) => Pick<KeyboardFocus, 'low' | 'high' | 'align'> | null
  legend: (t: Translate) => Readonly<Record<number, LegendLabel>>
  /** Границы ручной прокрутки, пока идёт задание; null — без границ. */
  bounds: PitchRange | null
  /** Легенда со значками: полоса выше всю сессию режима, чтобы стан не прыгал. */
  legendGlyphs: boolean
}

/** Первая буква заглавная: название интервала начинает формулировку («Большая терция»). */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const intervals: SolfegeView = {
  picture(t, state) {
    const notes = intervalNotes(state)
    const { content } = state.tasks[state.index] as IntervalTask
    const full = t(`interval.full.${content.interval}`)
    const arrow = content.direction === 'up' ? '↑' : '↓'
    let prompt: string
    let result: TaskPicture['result'] = null
    if (content.variant === 'play') {
      prompt = `${capitalize(full)} ${t(`solfege.direction.${content.direction}`)} ${arrow}`
    } else {
      prompt = t('solfege.intervals.which')
      if (state.phase === 'done') {
        const skipped = state.outcome === 'skip'
        result = skipped
          ? { look: 'answer', text: capitalize(full) }
          : { look: 'correct', text: `✓ ${capitalize(full)}` }
      } else if (state.wrong?.value) {
        result = {
          look: 'wrong',
          text: `✗ ${t(`interval.short.${state.wrong.value as IntervalId}`)}`,
        }
      }
    }
    return {
      prompt,
      result,
      key: JSON.stringify(notes),
      draw: (host, geometry) => drawSolfegeStaff(host, geometry, notes),
    }
  },
  marks: intervalKeyMarks,
  focus: (task) => intervalFocus(task as IntervalTask),
  // Короткие названия интервалов над клавишами на языке приложения (C-SOL-2, OB-7).
  legend: (t) =>
    Object.fromEntries(
      Object.entries(INTERVAL_KEYMAP).map(([pc, id]) => [pc, t(`interval.short.${id}`)]),
    ),
  bounds: INTERVALS_RANGE,
  legendGlyphs: false,
}

const durations: SolfegeView = {
  picture(t, state) {
    const sign = durationSign(state)
    const task = state.tasks[state.index] as DurationTask
    const full = t(`duration.task.${task.type as DurationTaskType}`)
    let result: TaskPicture['result'] = null
    if (state.phase === 'done') {
      result =
        state.outcome === 'skip'
          ? { look: 'answer', text: full }
          : { look: 'correct', text: `✓ ${full}` }
    } else if (state.wrong?.value) {
      result = { look: 'wrong', text: `✗ ${DURATION_FRACTION[state.wrong.value as DurationId]}` }
    }
    return {
      prompt: t('solfege.durations.which'),
      result,
      key: JSON.stringify(sign),
      draw: (host, geometry) => drawDurationSign(host, geometry, sign),
    }
  },
  marks: durationKeyMarks,
  // Клавиатура сама не сдвигается и прокручивается свободно (C-SOL-3, OB-8).
  focus: () => null,
  legend: () => DURATION_LEGEND,
  bounds: null,
  legendGlyphs: true,
}

export const SOLFEGE_VIEWS: Readonly<Record<SolfegeModeId, SolfegeView>> = { intervals, durations }

export const viewOf = (task: Task): SolfegeView => SOLFEGE_VIEWS[task.mode]
