// Задания «Длительностей» (C-SOL-3, OB-1…OB-5, OB-13): тип по трудности, коварные пары чаще и
// нередко подряд; нота — белая клавиша C4–B5, группа — 2–4 ноты из того же диапазона.

import type { Task } from '../types'
import { weightedPick } from '../../stats/weights'
import { stepOf } from '../../warmup/steps'
import {
  ALL_DURATION_TASK_TYPES,
  pairOf,
  parseDurationTaskType,
  type DurationId,
  type DurationTaskType,
  type SignKind,
} from './durations'
import { DURATION_KEYMAP } from './keymap'
import type { KindChoice } from './settings'

/** Высоты нот: первая и вторая октава, белые клавиши (LIM-1). */
const LOW_STEP = stepOf('C', 4)
const HIGH_STEP = stepOf('B', 5)

/** Нот в группе: 2–4 (LIM-4). */
const GROUP_MIN = 2
const GROUP_MAX = 4

/** Вес типов из коварных пар — вдвое больше обычного (LIM-3). */
const PAIR_WEIGHT = 2
/** После знака из коварной пары следом его пара — примерно в половине случаев (LIM-5). */
const PAIR_FOLLOW = 0.5

/** Что рисует задание: род, длительность и ступени нот (у паузы ступеней нет). */
export interface DurationContent {
  kind: SignKind
  duration: DurationId
  steps: readonly number[]
}

export type DurationTask = Task<DurationContent>

/** Клавиши, которые нужно видеть для ответа: до–соль первой октавы. Авто-сдвига у режима нет. */
const ANSWER_RANGE = { low: 60, high: 67 }

/** Типы заданий, доступные при выборе «Что тренировать». */
export function typesFor(kinds: KindChoice): DurationTaskType[] {
  return ALL_DURATION_TASK_TYPES.filter((type) => {
    const { kind } = parseDurationTaskType(type)
    if (kinds === 'notes') return kind !== 'rest'
    if (kinds === 'rests') return kind === 'rest'
    return true
  })
}

/**
 * n типов: после типа из коварной пары с вероятностью PAIR_FOLLOW — его пара; иначе взвешенный
 * выбор, где у типов пар вес вдвое больше. Подряд один тип не повторяется (C-SOL-1, OB-2).
 */
export function pickDurationTypes(
  n: number,
  types: readonly DurationTaskType[],
  weight: (type: string) => number,
  random: () => number,
): DurationTaskType[] {
  const picked: DurationTaskType[] = []
  for (let i = 0; i < n; i++) {
    const previous = picked[i - 1]
    const pair = previous ? pairOf(previous) : null
    if (pair && types.includes(pair) && random() < PAIR_FOLLOW) {
      picked.push(pair)
      continue
    }
    const options = types.length > 1 ? types.filter((type) => type !== previous) : types
    picked.push(
      weightedPick(options, (type) => weight(type) * (pairOf(type) ? PAIR_WEIGHT : 1), random),
    )
  }
  return picked
}

/** Ступени белых клавиш диапазона без повторов: count штук в случайном порядке. */
function randomSteps(count: number, random: () => number): number[] {
  const pool: number[] = []
  for (let step = LOW_STEP; step <= HIGH_STEP; step++) pool.push(step)
  const steps: number[] = []
  for (let i = 0; i < count; i++) {
    steps.push(pool.splice(Math.floor(random() * pool.length), 1)[0])
  }
  return steps
}

export function buildDurationTask(type: DurationTaskType, random: () => number): DurationTask {
  const { kind, duration } = parseDurationTaskType(type)
  const count =
    kind === 'rest'
      ? 0
      : kind === 'note'
        ? 1
        : GROUP_MIN + Math.floor(random() * (GROUP_MAX - GROUP_MIN + 1))
  return {
    mode: 'durations',
    type,
    answer: { kind: 'value', value: duration, table: DURATION_KEYMAP },
    range: ANSWER_RANGE,
    content: { kind, duration, steps: randomSteps(count, random) },
  }
}

/** Задания сессии (OB-2, OB-5). */
export function buildDurationTasks(
  count: number,
  kinds: KindChoice,
  weight: (type: string) => number,
  random: () => number,
): DurationTask[] {
  return pickDurationTypes(count, typesFor(kinds), weight, random).map((type) =>
    buildDurationTask(type, random),
  )
}
