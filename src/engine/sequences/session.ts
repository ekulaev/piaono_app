import { GROUP_MS } from '../staff/exercise'
import type { Sequence } from './generate'
import {
  initialVisibility,
  nextProgress,
  revealStep,
  type HintProgress,
  type HintVisibility,
} from './hints'

/** Отсчёт перед автоматическим переходом к следующей последовательности. */
export const COUNTDOWN_MS = 3000

export type StepResult = 'pending' | 'correct' | 'skipped'

/** Что случилось с шагом. hadError — была хотя бы одна ошибка до верного нажатия. */
export interface StepRecord {
  result: StepResult
  hadError: boolean
  /** От момента, когда шаг стал текущим, до верного нажатия; null — не сыгран верно. */
  reactionMs: number | null
  /** Над шагом была подсказка интервала в момент верного нажатия (для «Без подсказки»). */
  hinted: boolean
}

/** Нажатия в пределах GROUP_MS от первого — одна группа (аккорд). */
interface PressGroup {
  startedAt: number
  /** Верные ноты шага, уже нажатые в этой группе. */
  hits: number[]
  /** Неверные ноты этой группы (показываются полыми головками). */
  wrong: number[]
}

interface Common {
  sequences: Sequence[]
  seqIndex: number
  /** Результаты шагов текущей последовательности. */
  records: StepRecord[]
  /** Результаты завершённых последовательностей сессии. */
  history: StepRecord[][]
  autoAdvance: boolean
  /** Уровни подсказок; null — подсказки в этой сессии не действуют. */
  hints: HintProgress | null
}

export type SessionState =
  | { phase: 'idle' }
  | (Common & {
      phase: 'playing'
      stepIndex: number
      stepStartedAt: number
      group: PressGroup | null
      /** Полые головки неверных нот у текущего шага. */
      wrongPitches: number[]
      /** Растёт с каждой ошибкой — по нему UI перезапускает пульсацию. */
      errorCount: number
      /** Что показано над станом; null — подсказок нет. */
      visibility: HintVisibility | null
    })
  | (Common & {
      phase: 'finished'
      countdownUntil: number | null
      visibility: HintVisibility | null
    })
  | {
      phase: 'summary'
      sequences: Sequence[]
      history: StepRecord[][]
      autoAdvance: boolean
      hints: HintProgress | null
    }

export const IDLE: SessionState = { phase: 'idle' }

const pendingRecords = (sequence: Sequence): StepRecord[] =>
  sequence.steps.map(() => ({
    result: 'pending',
    hadError: false,
    reactionMs: null,
    hinted: false,
  }))

/**
 * Сессия режима «Последовательности» как автомат. Все функции чистые, время (мс, как
 * performance.now) передаётся параметром — логику проверяют тесты без ожидания.
 */
export function startSession(
  sequences: Sequence[],
  autoAdvance: boolean,
  now: number,
  hints: HintProgress | null = null,
): SessionState {
  return playSequence(
    { sequences, seqIndex: 0, records: [], history: [], autoAdvance, hints },
    0,
    now,
  )
}

function playSequence(common: Common, seqIndex: number, now: number): SessionState {
  const sequence = common.sequences[seqIndex]
  // Уровень берётся в начале последовательности и внутри неё не меняется.
  const visibility =
    common.hints && sequence.anchor !== null
      ? initialVisibility(common.hints[sequence.clef].level, sequence.steps.length)
      : null
  return {
    ...common,
    phase: 'playing',
    seqIndex,
    records: pendingRecords(common.sequences[seqIndex]),
    stepIndex: 0,
    stepStartedAt: now,
    group: null,
    wrongPitches: [],
    errorCount: 0,
    visibility,
  }
}

type Playing = Extract<SessionState, { phase: 'playing' }>

function currentStep(state: Playing): number[] {
  return state.sequences[state.seqIndex].steps[state.stepIndex]
}

/** Ошибка на текущем шаге: над ним появляется подсказка (если подсказки действуют). */
function revealCurrent(state: Playing): HintVisibility | null {
  return state.visibility && revealStep(state.visibility, state.stepIndex)
}

function withRecord(state: Playing, change: Partial<StepRecord>): StepRecord[] {
  return state.records.map((record, i) =>
    i === state.stepIndex ? { ...record, ...change } : record,
  )
}

/** Шаг завершён (верно или пропуском): следующий шаг или конец последовательности. */
function advance(state: Playing, records: StepRecord[], now: number): SessionState {
  const next = state.stepIndex + 1
  if (next < state.sequences[state.seqIndex].steps.length) {
    return { ...state, records, stepIndex: next, stepStartedAt: now, group: null, wrongPitches: [] }
  }
  const { sequences, seqIndex, history, autoAdvance, visibility } = state
  // Уровни пересчитываются только у завершённой последовательности: «Стоп» их не трогает.
  const hints = state.hints && nextProgress(state.hints, sequences[seqIndex].clef, records)
  return {
    phase: 'finished',
    sequences,
    seqIndex,
    records,
    history,
    autoAdvance,
    hints,
    visibility,
    countdownUntil: autoAdvance ? now + COUNTDOWN_MS : null,
  }
}

/**
 * Группа закончилась: если в ней были только верные ноты, но не все — это неполный аккорд,
 * ошибка без полых головок.
 */
function closeGroup(state: Playing, now: number): Playing {
  const group = state.group
  if (!group || now < group.startedAt + GROUP_MS) return state
  if (group.wrong.length === 0 && group.hits.length > 0) {
    return {
      ...state,
      group: null,
      records: withRecord(state, { hadError: true }),
      wrongPitches: [],
      errorCount: state.errorCount + 1,
      visibility: revealCurrent(state),
    }
  }
  return { ...state, group: null }
}

/** Сыгранная нота. Вне шага (итог, пауза, стоп) ничего не меняет. */
export function played(state: SessionState, pitch: number, now: number): SessionState {
  if (state.phase !== 'playing') return state
  const current = closeGroup(state, now)
  const step = currentStep(current)
  const group: PressGroup = current.group ?? { startedAt: now, hits: [], wrong: [] }

  if (!step.includes(pitch)) {
    // Лишняя нота — ошибка сразу. Первая ошибка группы перезапускает пульсацию.
    const firstInGroup = group.wrong.length === 0
    const wrong = [...group.wrong, pitch]
    return {
      ...current,
      group: { ...group, wrong },
      wrongPitches: wrong,
      records: withRecord(current, { hadError: true }),
      errorCount: firstInGroup ? current.errorCount + 1 : current.errorCount,
      visibility: revealCurrent(current),
    }
  }

  const hits = group.hits.includes(pitch) ? group.hits : [...group.hits, pitch]
  const complete = group.wrong.length === 0 && step.every((note) => hits.includes(note))
  if (complete) {
    const records = withRecord(current, {
      result: 'correct',
      reactionMs: now - current.stepStartedAt,
      hinted: current.visibility?.steps[current.stepIndex] ?? false,
    })
    return advance(current, records, now)
  }
  return { ...current, group: { ...group, hits } }
}

/** «Пропустить»: шаг пропущен, время реакции не записывается. */
export function skip(state: SessionState, now: number): SessionState {
  if (state.phase !== 'playing') return state
  return advance(state, withRecord(state, { result: 'skipped' }), now)
}

/** «Далее» или конец отсчёта: следующая последовательность или итог. */
export function next(state: SessionState, now: number): SessionState {
  if (state.phase !== 'finished') return state
  const history = [...state.history, state.records]
  const { sequences, autoAdvance, hints } = state
  if (state.seqIndex + 1 < sequences.length) {
    return playSequence(
      { sequences, seqIndex: 0, records: [], history, autoAdvance, hints },
      state.seqIndex + 1,
      now,
    )
  }
  return { phase: 'summary', sequences, history, autoAdvance, hints }
}

/** Продвинуть по времени: закрыть группу, завершить отсчёт. */
export function tick(state: SessionState, now: number): SessionState {
  if (state.phase === 'playing') return closeGroup(state, now)
  if (state.phase === 'finished' && state.countdownUntil !== null && now >= state.countdownUntil) {
    return next(state, state.countdownUntil)
  }
  return state
}

/**
 * Флажок «Переключать автоматически» переключили во время сессии. Если последовательность
 * уже завершена, отсчёт запускается сразу (включили) или снимается (выключили).
 */
export function setAutoAdvance(
  state: SessionState,
  autoAdvance: boolean,
  now: number,
): SessionState {
  if (state.phase === 'idle' || state.autoAdvance === autoAdvance) return state
  if (state.phase === 'finished') {
    return { ...state, autoAdvance, countdownUntil: autoAdvance ? now + COUNTDOWN_MS : null }
  }
  return { ...state, autoAdvance }
}

export function stop(): SessionState {
  return IDLE
}

/** «Повторить»: те же последовательности в том же порядке, с текущими уровнями подсказок. */
export function repeat(state: SessionState, now: number): SessionState {
  if (state.phase !== 'summary') return state
  return startSession(state.sequences, state.autoAdvance, now, state.hints)
}

/** Сколько секунд показать на кнопке «Далее (N)»; null — отсчёта нет. */
export function countdownSeconds(state: SessionState, now: number): number | null {
  if (state.phase !== 'finished' || state.countdownUntil === null) return null
  return Math.max(1, Math.ceil((state.countdownUntil - now) / 1000))
}

export interface SessionSummary {
  correctFirstTry: number
  withError: number
  skipped: number
  /** Доля верных с первой попытки среди непропущенных, 0–1; null — непропущенных нет. */
  accuracy: number | null
  /** До пяти нот с наибольшим средним временем реакции, по убыванию. */
  slowest: { pitch: number; averageMs: number }[]
  /**
   * «Без подсказки: count из of»: верные с первой попытки без подсказки над шагом среди
   * непропущенных. null — сессия шла без подсказок.
   */
  withoutHint: { count: number; of: number } | null
}

export function summarize(
  sequences: Sequence[],
  history: StepRecord[][],
  hintsUsed = false,
): SessionSummary {
  let withoutHintCount = 0
  let correctFirstTry = 0
  let withError = 0
  let skipped = 0
  const times = new Map<number, number[]>()

  history.forEach((records, seqIndex) => {
    records.forEach((record, stepIndex) => {
      if (record.result === 'skipped') skipped++
      else if (record.result === 'correct') {
        if (record.hadError) withError++
        else correctFirstTry++
        if (!record.hadError && !record.hinted) withoutHintCount++
        // Время шага из нескольких нот относится к каждой его ноте.
        for (const pitch of sequences[seqIndex].steps[stepIndex]) {
          times.set(pitch, [...(times.get(pitch) ?? []), record.reactionMs ?? 0])
        }
      }
    })
  })

  const played = correctFirstTry + withError
  const slowest = [...times.entries()]
    .map(([pitch, list]) => ({ pitch, averageMs: list.reduce((a, b) => a + b, 0) / list.length }))
    .sort((a, b) => b.averageMs - a.averageMs)
    .slice(0, 5)

  return {
    correctFirstTry,
    withError,
    skipped,
    accuracy: played === 0 ? null : correctFirstTry / played,
    slowest,
    withoutHint: hintsUsed ? { count: withoutHintCount, of: played } : null,
  }
}
