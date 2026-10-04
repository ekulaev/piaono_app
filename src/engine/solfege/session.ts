// Ход сессии сольфеджио (C-SOL-1) как автомат: задание → ответ → оценка → «Далее» → итог.
// Общий для всех режимов сольфеджио: режим даёт только список заданий. Все функции чистые,
// время (мс, как performance.now) передаётся параметром — логику проверяют тесты без ожидания.

import { applyEvents, type ModeStats, type StatEvent } from '../stats/stats'
import { evaluateLong, isSameNote, valueOfKey } from './check'
import { taskEvent } from './events'
import type { Task, TaskOutcome, TaskRecord } from './types'

// Отсчёт перед автоматическим переходом — тот же, что у «Последовательностей» (C-STF-2).
import { COUNTDOWN_MS } from '../sequences/session'

export { COUNTDOWN_MS }

/** Последнее неверное нажатие короткого ответа: что показать красным (OB-5). */
export interface WrongPress {
  pitch: number
  /** Значение клавиши по таблице — у ответа-значения; null — у ответа-ноты. */
  value: string | null
}

/** Оценка длинного ответа с ошибкой: сыгранные ноты и верна ли каждая (OB-6). */
export interface LongReview {
  played: number[]
  correct: boolean[]
}

/** История до сессии и события завершённых заданий (C-SOL-1, OB-16). */
export interface SolfegeStats {
  before: ModeStats
  events: readonly StatEvent[]
}

interface Common {
  tasks: readonly Task[]
  index: number
  /** Исходы завершённых заданий сессии. */
  history: TaskRecord[]
  autoAdvance: boolean
  stats: SolfegeStats
}

export type SolfegeState =
  | { phase: 'idle' }
  | (Common & {
      phase: 'asking'
      startedAt: number
      /** Неверных попыток в этом задании. */
      errors: number
      /** Последнее неверное нажатие короткого ответа; null — его нет или уже верно. */
      wrong: WrongPress | null
      /** Длинный ответ: ноты текущей попытки до оценки. */
      entered: number[]
      /** Длинный ответ: оценка попытки с ошибкой; держится до следующего нажатия. */
      review: LongReview | null
    })
  | (Common & {
      phase: 'done'
      outcome: TaskOutcome
      /** Неверное нажатие, после которого был пропуск, или ошибочная оценка — остаются видны. */
      wrong: WrongPress | null
      review: LongReview | null
      countdownUntil: number | null
    })
  | {
      phase: 'summary'
      tasks: readonly Task[]
      history: TaskRecord[]
      autoAdvance: boolean
      stats: SolfegeStats
    }

export const IDLE: SolfegeState = { phase: 'idle' }

type Asking = Extract<SolfegeState, { phase: 'asking' }>

export function startSession(
  tasks: readonly Task[],
  autoAdvance: boolean,
  stats: ModeStats,
  now: number,
): SolfegeState {
  if (tasks.length === 0) return IDLE
  return ask(
    { tasks, index: 0, history: [], autoAdvance, stats: { before: stats, events: [] } },
    0,
    now,
  )
}

function ask(common: Common, index: number, now: number): SolfegeState {
  return {
    ...common,
    phase: 'asking',
    index,
    startedAt: now,
    errors: 0,
    wrong: null,
    entered: [],
    review: null,
  }
}

/** Задание завершено: исход в историю и в статистику, «Пропустить» сменяется на «Далее». */
function finish(
  state: Asking,
  outcome: TaskOutcome,
  now: number,
  shown: Pick<Asking, 'wrong' | 'review'>,
): SolfegeState {
  const task = state.tasks[state.index]
  const record: TaskRecord = {
    outcome,
    ms: outcome === 'clean' ? now - state.startedAt : null,
    errors: state.errors,
  }
  return {
    phase: 'done',
    tasks: state.tasks,
    index: state.index,
    history: [...state.history, record],
    autoAdvance: state.autoAdvance,
    stats: { ...state.stats, events: [...state.stats.events, taskEvent(task, record)] },
    outcome,
    wrong: shown.wrong,
    review: shown.review,
    countdownUntil: state.autoAdvance ? now + COUNTDOWN_MS : null,
  }
}

/** Сыгранная нота (пианино или касание). Вне задания ничего не меняет (OB-9). */
export function press(state: SolfegeState, pitch: number, now: number): SolfegeState {
  if (state.phase !== 'asking') return state
  const answer = state.tasks[state.index].answer

  if (answer.kind === 'value') {
    const value = valueOfKey(answer.table, pitch)
    // Клавиша вне таблицы: ни верно, ни неверно (OB-4).
    if (value === null) return state
    if (value === answer.value) {
      return finish(state, state.errors > 0 ? 'error' : 'clean', now, { wrong: null, review: null })
    }
    return { ...state, errors: state.errors + 1, wrong: { pitch, value } }
  }

  if (answer.pitches.length === 1) {
    if (isSameNote(answer.pitches[0], pitch)) {
      return finish(state, state.errors > 0 ? 'error' : 'clean', now, { wrong: null, review: null })
    }
    return { ...state, errors: state.errors + 1, wrong: { pitch, value: null } }
  }

  // Длинный ответ: после оценки с ошибкой нажатие начинает новую попытку целиком (OB-7).
  const entered = state.review ? [pitch] : [...state.entered, pitch]
  if (entered.length < answer.pitches.length) return { ...state, entered, review: null }
  const correct = evaluateLong(answer.pitches, entered)
  if (correct.every(Boolean)) {
    return finish(state, state.errors > 0 ? 'error' : 'clean', now, { wrong: null, review: null })
  }
  return {
    ...state,
    errors: state.errors + 1,
    entered: [],
    review: { played: entered, correct },
  }
}

/** «Пропустить»: верный ответ показан, исход — «пропущено» (OB-8). */
export function skip(state: SolfegeState, now: number): SolfegeState {
  if (state.phase !== 'asking') return state
  return finish(state, 'skip', now, { wrong: state.wrong, review: state.review })
}

/** «Далее» или конец отсчёта: следующее задание или итог (OB-11, OB-18). */
export function next(state: SolfegeState, now: number): SolfegeState {
  if (state.phase !== 'done') return state
  const { tasks, history, autoAdvance, stats } = state
  if (state.index + 1 < tasks.length) {
    return ask({ tasks, index: 0, history, autoAdvance, stats }, state.index + 1, now)
  }
  return { phase: 'summary', tasks, history, autoAdvance, stats }
}

/** Продвинуть по времени: завершить отсчёт автоперехода. */
export function tick(state: SolfegeState, now: number): SolfegeState {
  if (state.phase === 'done' && state.countdownUntil !== null && now >= state.countdownUntil) {
    return next(state, state.countdownUntil)
  }
  return state
}

/**
 * Флажок «Переключать автоматически» переключили во время сессии: у завершённого задания
 * отсчёт запускается сразу (включили) или снимается (выключили).
 */
export function setAutoAdvance(
  state: SolfegeState,
  autoAdvance: boolean,
  now: number,
): SolfegeState {
  if (state.phase === 'idle' || state.autoAdvance === autoAdvance) return state
  if (state.phase === 'done') {
    return { ...state, autoAdvance, countdownUntil: autoAdvance ? now + COUNTDOWN_MS : null }
  }
  return { ...state, autoAdvance }
}

/** «Стоп» и уход в меню: без итога; незавершённое задание не записано (OB-17). */
export function stop(): SolfegeState {
  return IDLE
}

/** «Повторить»: те же задания в том же порядке; история — вместе с этой сессией. */
export function repeat(state: SolfegeState, now: number): SolfegeState {
  if (state.phase !== 'summary') return state
  const stats = applyEvents(state.stats.before, state.stats.events)
  return startSession(state.tasks, state.autoAdvance, stats, now)
}

/** Сколько секунд показать на кнопке «Далее (N)»; null — отсчёта нет. */
export function countdownSeconds(state: SolfegeState, now: number): number | null {
  if (state.phase !== 'done' || state.countdownUntil === null) return null
  return Math.max(1, Math.ceil((state.countdownUntil - now) / 1000))
}

/** Сколько трудных типов заданий в итоге сессии. */
export const MAX_HARD_TYPES = 5

export interface SolfegeSummary {
  clean: number
  withError: number
  skipped: number
  /**
   * Трудные типы этой сессии (OB-18): задания с ошибками или пропуском — сначала пропущенные,
   * потом по числу ошибок; каждый тип один раз, до MAX_HARD_TYPES.
   */
  hardTypes: string[]
}

/** Итог сессии: сколько заданий каким исходом и что далось труднее. */
export function summarize(tasks: readonly Task[], history: readonly TaskRecord[]): SolfegeSummary {
  const hard = history
    .map((record, i) => ({ record, type: tasks[i].type, i }))
    .filter(({ record }) => record.outcome !== 'clean')
    .sort(
      (a, b) =>
        Number(b.record.outcome === 'skip') - Number(a.record.outcome === 'skip') ||
        b.record.errors - a.record.errors ||
        a.i - b.i,
    )
  const hardTypes = [...new Set(hard.map(({ type }) => type))].slice(0, MAX_HARD_TYPES)
  return {
    clean: history.filter((r) => r.outcome === 'clean').length,
    withError: history.filter((r) => r.outcome === 'error').length,
    skipped: history.filter((r) => r.outcome === 'skip').length,
    hardTypes,
  }
}
