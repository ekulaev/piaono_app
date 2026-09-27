import { GROUP_MS } from '../staff/exercise'
import type { Sequence } from './generate'
import {
  initialVisibility,
  nextProgress,
  revealStep,
  type HintProgress,
  type HintVisibility,
} from './hints'
import { pitchToNoteName } from '../../midi/noteNames'
import { contourEvents, sequenceEvents } from '../stats/events'
import { label } from '../stats/improvements'
import { intervalKey } from '../stats/stats'
import { intervalBetween } from './anchors'
import { applyEvents, type ModeStats, type StatEvent } from '../stats/stats'

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
  /** Статистика режима: история до сессии и события сессии; null — не ведётся. */
  stats: SessionStats | null
  /**
   * Как проверяется шаг: exact — точные ноты («Последовательности»), contour — только
   * направление от последней верной клавиши («Контур», C-STF-5).
   */
  check: StepCheck
}

export type StepCheck = 'exact' | 'contour'

/** История до сессии и события завершённых последовательностей этой сессии (C-STF-4). */
export interface SessionStats {
  before: ModeStats
  events: readonly StatEvent[]
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
      /** «Контур»: последняя клавиша, засчитанная верной; null — шаг примет любую клавишу. */
      reference: number | null
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
      stats: SessionStats | null
      check: StepCheck
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
  stats: ModeStats | null = null,
  check: StepCheck = 'exact',
): SessionState {
  return playSequence(
    {
      sequences,
      seqIndex: 0,
      records: [],
      history: [],
      autoAdvance,
      hints,
      stats: stats && { before: stats, events: [] },
      check,
    },
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
    reference: null,
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
  const { sequences, seqIndex, history, autoAdvance, visibility, check } = state
  // Уровни пересчитываются только у завершённой последовательности: «Стоп» их не трогает.
  const hints = state.hints && nextProgress(state.hints, sequences[seqIndex].clef, records)
  // Статистика тоже пишется только у завершённой последовательности (C-STF-4, OB-5).
  const stats = state.stats && {
    ...state.stats,
    events: [
      ...state.stats.events,
      ...(check === 'contour' ? contourEvents : sequenceEvents)(sequences[seqIndex], records),
    ],
  }
  return {
    phase: 'finished',
    sequences,
    seqIndex,
    records,
    history,
    autoAdvance,
    hints,
    stats,
    check,
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

/** Ошибка на текущем шаге «Контура»: шаг пульсирует, точка отсчёта прежняя. */
function contourError(state: Playing): Playing {
  return {
    ...state,
    group: null,
    records: withRecord(state, { hadError: true }),
    errorCount: state.errorCount + 1,
  }
}

/**
 * «Контур»: группа нажатий оценивается, когда закончилась (C-STF-5, OB-9) — иначе нельзя
 * отличить одну клавишу от нескольких. Одна клавиша верна, если шаг без точки отсчёта или
 * направление от точки отсчёта совпадает с записанным; несколько клавиш — ошибка.
 */
function closeContourGroup(state: Playing, now: number): SessionState {
  const group = state.group
  if (!group || now < group.startedAt + GROUP_MS) return state
  const decidedAt = group.startedAt + GROUP_MS
  if (group.hits.length !== 1) return contourError(state)

  const key = group.hits[0]
  const steps = state.sequences[state.seqIndex].steps
  const i = state.stepIndex
  const correct =
    state.reference === null ||
    Math.sign(key - state.reference) === Math.sign(steps[i][0] - steps[i - 1][0])
  if (!correct) return contourError(state)

  const records = withRecord(state, {
    result: 'correct',
    reactionMs: group.startedAt - state.stepStartedAt,
  })
  return advance({ ...state, group: null, reference: key }, records, decidedAt)
}

/** «Контур»: нажатие только копит группу — оценка при её закрытии. */
function playedContour(state: Playing, pitch: number, now: number): SessionState {
  const current = closeContourGroup(state, now)
  if (current.phase !== 'playing') return current
  const group = current.group ?? { startedAt: now, hits: [], wrong: [] }
  const hits = group.hits.includes(pitch) ? group.hits : [...group.hits, pitch]
  return { ...current, group: { ...group, hits } }
}

/** Сыгранная нота. Вне шага (итог, пауза, стоп) ничего не меняет. */
export function played(state: SessionState, pitch: number, now: number): SessionState {
  if (state.phase !== 'playing') return state
  if (state.check === 'contour') return playedContour(state, pitch, now)
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

/**
 * «Пропустить»: шаг пропущен, время реакции не записывается. В «Контуре» следующий шаг
 * снова принимает любую клавишу — точка отсчёта задаётся заново (C-STF-5, OB-10).
 */
export function skip(state: SessionState, now: number): SessionState {
  if (state.phase !== 'playing') return state
  return advance(
    { ...state, group: null, reference: null },
    withRecord(state, { result: 'skipped' }),
    now,
  )
}

/** «Далее» или конец отсчёта: следующая последовательность или итог. */
export function next(state: SessionState, now: number): SessionState {
  if (state.phase !== 'finished') return state
  const history = [...state.history, state.records]
  const { sequences, autoAdvance, hints, stats, check } = state
  if (state.seqIndex + 1 < sequences.length) {
    return playSequence(
      { sequences, seqIndex: 0, records: [], history, autoAdvance, hints, stats, check },
      state.seqIndex + 1,
      now,
    )
  }
  return { phase: 'summary', sequences, history, autoAdvance, hints, stats, check }
}

/** Продвинуть по времени: закрыть группу, завершить отсчёт. */
export function tick(state: SessionState, now: number): SessionState {
  if (state.phase === 'playing') {
    return state.check === 'contour' ? closeContourGroup(state, now) : closeGroup(state, now)
  }
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
  // Следующая сессия сравнивается с историей, в которую вошла эта.
  const stats = state.stats && applyEvents(state.stats.before, state.stats.events)
  return startSession(state.sequences, state.autoAdvance, now, state.hints, stats, state.check)
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
  /**
   * До пяти самых медленных мест по среднему времени реакции, по убыванию: ноты («C4») в
   * «Последовательностях», переходы («↑3», «=») в «Контуре».
   */
  slowest: { label: string; averageMs: number }[]
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
  check: StepCheck = 'exact',
): SessionSummary {
  let withoutHintCount = 0
  let correctFirstTry = 0
  let withError = 0
  let skipped = 0
  const times = new Map<string, number[]>()
  const addTime = (label: string, ms: number) => times.set(label, [...(times.get(label) ?? []), ms])

  history.forEach((records, seqIndex) => {
    records.forEach((record, stepIndex) => {
      if (record.result === 'skipped') skipped++
      else if (record.result === 'correct') {
        if (record.hadError) withError++
        else correctFirstTry++
        if (!record.hadError && !record.hinted) withoutHintCount++
        const steps = sequences[seqIndex].steps
        if (check === 'contour') {
          // Переход — к шагу, у которого была точка отсчёта (C-STF-5, OB-12); время — только
          // у сыгранных сразу, как в статистике «Контура».
          if (!record.hadError && stepIndex > 0 && records[stepIndex - 1].result !== 'skipped') {
            const { size, direction } = intervalBetween(
              steps[stepIndex - 1][0],
              steps[stepIndex][0],
            )
            addTime(label('interval', intervalKey(size, direction)), record.reactionMs ?? 0)
          }
        } else {
          // Время шага из нескольких нот относится к каждой его ноте.
          for (const pitch of steps[stepIndex])
            addTime(pitchToNoteName(pitch), record.reactionMs ?? 0)
        }
      }
    })
  })

  const played = correctFirstTry + withError
  const slowest = [...times.entries()]
    .map(([label, list]) => ({ label, averageMs: list.reduce((a, b) => a + b, 0) / list.length }))
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
