// Сессия «Ритма» как автомат (C-STF-6). Функции чистые, время удара — параметр (момент нажатия
// из события пианино или касания), поэтому логику проверяют тесты без ожидания. Таймеров нет:
// рисунок ждёт ученика сколько угодно.

import { applyEvents, type ModeStats, type StatEvent } from '../stats/stats'
import { FIGURES, isRestFigure, type FigureId } from './figures'
import { evaluateTaps, type Mark } from './evaluate'
import { patternFigures, type Pattern } from './generate'

/** Нажатия в пределах этого окна от удара — тот же удар (аккорд, LIM-4). */
export const CHORD_MS = 50

/** История до сессии и события оценённых попыток этой сессии (как у C-STF-4). */
export interface RhythmStats {
  before: ModeStats
  events: readonly StatEvent[]
}

interface Common {
  patterns: Pattern[]
  index: number
  /** Оценённые попытки текущего рисунка. */
  attempts: Mark[][]
  /** Оценённые попытки завершённых рисунков сессии; у пропущенного — пусто. */
  history: Mark[][][]
  /** Время последнего засчитанного удара — для окна аккорда; null — ударов ещё не было. */
  lastTapAt: number | null
  stats: RhythmStats | null
}

export type RhythmState =
  | { phase: 'idle' }
  /** Рисунок показан, ударов нет — на кнопке «Пропустить». */
  | (Common & { phase: 'ready' })
  /** Идут удары — на кнопке «Сначала». */
  | (Common & { phase: 'tapping'; taps: number[] })
  /** Попытка оценена — на кнопке «Далее»; удар начинает новую попытку. */
  | (Common & { phase: 'evaluated'; taps: number[]; marks: Mark[] })
  | { phase: 'summary'; patterns: Pattern[]; history: Mark[][][]; stats: RhythmStats | null }

export const IDLE: RhythmState = { phase: 'idle' }

export function startRhythm(patterns: Pattern[], stats: ModeStats | null = null): RhythmState {
  return {
    phase: 'ready',
    patterns,
    index: 0,
    attempts: [],
    history: [],
    lastTapAt: null,
    stats: stats && { before: stats, events: [] },
  }
}

/** Нажатие любой клавиши в момент time. */
export function tap(state: RhythmState, time: number): RhythmState {
  if (state.phase === 'idle' || state.phase === 'summary') return state
  // Вторая клавиша аккорда — не новый удар.
  if (state.lastTapAt !== null && time - state.lastTapAt < CHORD_MS) return state
  const taps = state.phase === 'tapping' ? [...state.taps, time] : [time]
  const common = commonOf(state)
  const pattern = state.patterns[state.index]
  if (taps.length < pattern.notes.length) {
    return { ...common, phase: 'tapping', taps, lastTapAt: time }
  }
  const marks = evaluateTaps(pattern, taps)
  const events = rhythmEvents(pattern, marks)
  return {
    ...common,
    phase: 'evaluated',
    taps,
    marks,
    lastTapAt: time,
    attempts: [...state.attempts, marks],
    stats: state.stats && { ...state.stats, events: [...state.stats.events, ...events] },
  }
}

/** «Пропустить»: только до первого удара. Рисунок в статистику не попадает. */
export function skip(state: RhythmState): RhythmState {
  if (state.phase !== 'ready') return state
  return advance(state)
}

/** «Сначала»: удары сброшены, попытка в статистику не попадает. */
export function restart(state: RhythmState): RhythmState {
  if (state.phase !== 'tapping') return state
  return { ...commonOf(state), phase: 'ready', lastTapAt: null }
}

/** «Далее» после оценки: следующий рисунок или итог. */
export function next(state: RhythmState): RhythmState {
  if (state.phase !== 'evaluated') return state
  return advance(state)
}

export function stop(): RhythmState {
  return IDLE
}

/** «Повторить»: те же рисунки; история сравнения уже включает эту сессию. */
export function repeat(state: RhythmState): RhythmState {
  if (state.phase !== 'summary') return state
  const stats = state.stats && applyEvents(state.stats.before, state.stats.events)
  return startRhythm(state.patterns, stats)
}

function commonOf(state: Common): Common {
  const { patterns, index, attempts, history, lastTapAt, stats } = state
  return { patterns, index, attempts, history, lastTapAt, stats }
}

function advance(state: Common): RhythmState {
  const history = [...state.history, state.attempts]
  const index = state.index + 1
  if (index >= state.patterns.length) {
    return { phase: 'summary', patterns: state.patterns, history, stats: state.stats }
  }
  return { ...commonOf(state), phase: 'ready', index, attempts: [], history, lastTapAt: null }
}

/**
 * События оценённой попытки (OB-11): каждая фигура с нотами — «чисто», если все её ноты вовремя,
 * иначе «с ошибкой». Паузы ударов не принимают, и у них нечего оценивать. Времени нет.
 */
export function rhythmEvents(pattern: Pattern, marks: readonly Mark[]): StatEvent[] {
  const figures = patternFigures(pattern)
  const clean = figures.map(() => true)
  pattern.notes.forEach((note, i) => {
    if (marks[i] !== 'onTime') clean[note.figure] = false
  })
  return figures.flatMap((id, i): StatEvent[] =>
    isRestFigure(id)
      ? []
      : [{ kind: 'figure', key: id, outcome: clean[i] ? 'clean' : 'error', ms: null }],
  )
}

export interface RhythmSummary {
  /** Рисунков, у которых первая оценённая попытка — все ноты вовремя. */
  cleanFirstTry: number
  /** Всего оценённых попыток. */
  attempts: number
  /** Доля нот «вовремя» среди всех оценённых, 0–1; null — оценённых нет. */
  onTimeShare: number | null
  early: number
  late: number
  /** До трёх фигур сессии с наибольшей долей попыток с ошибкой; пусто — всё чисто. */
  hardest: { label: string; errors: number; attempts: number }[]
}

export function summarizeRhythm(patterns: Pattern[], history: Mark[][][]): RhythmSummary {
  let cleanFirstTry = 0
  let attempts = 0
  let onTime = 0
  let early = 0
  let late = 0
  const figures = new Map<FigureId, { errors: number; attempts: number }>()

  history.forEach((patternAttempts, index) => {
    if (patternAttempts[0]?.every((mark) => mark === 'onTime')) cleanFirstTry++
    for (const marks of patternAttempts) {
      attempts++
      for (const mark of marks) {
        if (mark === 'onTime') onTime++
        else if (mark === 'early') early++
        else late++
      }
      for (const event of rhythmEvents(patterns[index], marks)) {
        const id = event.key as FigureId
        const counts = figures.get(id) ?? { errors: 0, attempts: 0 }
        counts.attempts++
        if (event.outcome === 'error') counts.errors++
        figures.set(id, counts)
      }
    }
  })

  const hardest = [...figures.entries()]
    .filter(([, counts]) => counts.errors > 0)
    .sort(([, a], [, b]) => b.errors / b.attempts - a.errors / a.attempts || b.errors - a.errors)
    .slice(0, 3)
    .map(([id, counts]) => ({ label: FIGURES[id].label, ...counts }))

  const marks = onTime + early + late
  return {
    cleanFirstTry,
    attempts,
    onTimeShare: marks === 0 ? null : onTime / marks,
    early,
    late,
    hardest,
  }
}
