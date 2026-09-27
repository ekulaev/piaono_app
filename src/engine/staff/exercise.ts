import type { WarmupResult } from '../stats/events'
import { UNIFORM, type Weights } from '../stats/weights'
import { pickNote, type StaffNote } from './pickNote'

/** Нота едет от правого края стана до ключа за это время. */
export const TRAVEL_MS = 5000
/** Столько нота показана верной или неверной. */
export const FLASH_MS = 500
/** Пауза с пустым станом между нотами. */
export const PAUSE_MS = 500
/** Нажатия в пределах этого окна от первого считаются одновременными (аккорд). */
export const GROUP_MS = 50

/** Итоги законченных нот сессии (от «Старт» до «Стоп») — для статистики и итога. */
type Results = { results: readonly WarmupResult[] }

export type ExerciseState =
  | { phase: 'idle' }
  | (Results & {
      phase: 'moving'
      note: StaffNote
      appearedAt: number
      /** До какого момента нота показана неверной; null — не показана. */
      wrongUntil: number | null
      /** Открытая группа одновременных нажатий без верной ноты. */
      groupStartedAt: number | null
      /** Были ли неверные нажатия по этой ноте. */
      hadError: boolean
    })
  | (Results & { phase: 'correct'; note: StaffNote; progress: number; until: number })
  | (Results & { phase: 'pause'; until: number })
  /** Итог после «Стоп» (C-STF-4, OB-12): стан скрыт, пока не нажат «Старт». */
  | (Results & { phase: 'summary' })

export const IDLE: ExerciseState = { phase: 'idle' }

/**
 * Упражнение как автомат. Все функции чистые, текущее время (мс, как performance.now)
 * передаётся параметром: логику можно проверить тестами без реального ожидания.
 * Моменты переходов берутся из расписания (appearedAt + TRAVEL_MS и т. п.), а не из
 * момента кадра, поэтому редкие кадры не копят ошибку тайминга.
 */
export function start(
  now: number,
  random: () => number,
  weights: Weights = UNIFORM,
): ExerciseState {
  return appear(now, random, [], weights)
}

/** Остановка без итога: меню режимов, «Проверка пианино». */
export function stop(): ExerciseState {
  return IDLE
}

/** «Стоп»: итог, если закончилась хотя бы одна нота; иначе — пустой стан. */
export function finish(state: ExerciseState): ExerciseState {
  if (state.phase === 'idle' || state.phase === 'summary') return state
  return state.results.length > 0 ? { phase: 'summary', results: state.results } : IDLE
}

function appear(
  at: number,
  random: () => number,
  results: readonly WarmupResult[],
  weights: Weights,
): ExerciseState {
  return {
    phase: 'moving',
    note: pickNote(random, weights),
    appearedAt: at,
    wrongUntil: null,
    groupStartedAt: null,
    hadError: false,
    results,
  }
}

/** Нажатие клавиши. Без движущейся ноты ничего не меняет. */
export function played(state: ExerciseState, pitch: number, now: number): ExerciseState {
  if (state.phase !== 'moving') return state
  // Предыдущая группа могла закончиться, а кадра между ней и этим нажатием не было.
  const current = closeExpiredGroup(state, now)
  if (current.phase !== 'moving') return current

  if (pitch === current.note.pitch) {
    const result: WarmupResult = {
      ...current.note,
      outcome: current.hadError ? 'error' : 'clean',
      ms: current.hadError ? null : now - current.appearedAt,
    }
    return {
      phase: 'correct',
      note: current.note,
      progress: progress(current, now),
      until: now + FLASH_MS,
      results: [...current.results, result],
    }
  }
  // Неверная клавиша открывает группу; внутри уже открытой группы ничего не меняет.
  if (current.groupStartedAt !== null) return current
  return { ...current, groupStartedAt: now }
}

/** Продвинуть автомат по времени: закрыть группу, погасить подсветку, сменить фазу. */
export function tick(
  state: ExerciseState,
  now: number,
  random: () => number,
  weights: Weights = UNIFORM,
): ExerciseState {
  let current = state
  // Цикл: после долгого перерыва между кадрами можно пройти несколько фаз подряд.
  for (;;) {
    const next = step(current, now, random, weights)
    if (next === current) return current
    current = next
  }
}

function step(
  state: ExerciseState,
  now: number,
  random: () => number,
  weights: Weights,
): ExerciseState {
  switch (state.phase) {
    case 'idle':
    case 'summary':
      return state
    case 'moving': {
      const arrivedAt = state.appearedAt + TRAVEL_MS
      if (
        state.groupStartedAt !== null &&
        state.groupStartedAt + GROUP_MS <= Math.min(now, arrivedAt)
      ) {
        return closeExpiredGroup(state, now)
      }
      if (now >= arrivedAt) {
        // Доехала до ключа: «не успел», даже если были неверные нажатия.
        const missed: WarmupResult = { ...state.note, outcome: 'missed', ms: null }
        return { phase: 'pause', until: arrivedAt + PAUSE_MS, results: [...state.results, missed] }
      }
      if (state.wrongUntil !== null && now >= state.wrongUntil)
        return { ...state, wrongUntil: null }
      return state
    }
    case 'correct':
      return now >= state.until
        ? { phase: 'pause', until: state.until + PAUSE_MS, results: state.results }
        : state
    case 'pause':
      return now >= state.until ? appear(state.until, random, state.results, weights) : state
  }
}

/** Группа без верной ноты закончилась: нота неверна ещё FLASH_MS после её конца. */
function closeExpiredGroup(state: ExerciseState & { phase: 'moving' }, now: number) {
  if (state.groupStartedAt === null || now < state.groupStartedAt + GROUP_MS) return state
  const groupEnd = state.groupStartedAt + GROUP_MS
  return { ...state, groupStartedAt: null, wrongUntil: groupEnd + FLASH_MS, hadError: true }
}

/** Доля пройденного пути: 0 — у правого края стана, 1 — у ключа. */
export function progress(state: ExerciseState, now: number): number {
  if (state.phase === 'correct') return state.progress
  if (state.phase !== 'moving') return 0
  return Math.min(1, Math.max(0, (now - state.appearedAt) / TRAVEL_MS))
}

/** Показана ли нота неверной прямо сейчас. */
export function isWrong(state: ExerciseState, now: number): boolean {
  return state.phase === 'moving' && state.wrongUntil !== null && now < state.wrongUntil
}

export interface WarmupSummary {
  clean: number
  errors: number
  missed: number
  /** Доля верных сразу среди всех законченных нот, 0–1. */
  accuracy: number
  /** До пяти нот с наибольшим средним временем верного сразу, по убыванию. */
  slowest: { pitch: number; clef: StaffNote['clef']; averageMs: number }[]
}

/** Итог сессии «Разминки» (C-STF-4, OB-12). */
export function summarizeWarmup(results: readonly WarmupResult[]): WarmupSummary {
  const count = (outcome: WarmupResult['outcome']) =>
    results.filter((r) => r.outcome === outcome).length
  const times = new Map<string, { pitch: number; clef: StaffNote['clef']; list: number[] }>()
  for (const r of results) {
    if (r.outcome !== 'clean' || r.ms === null) continue
    const key = `${r.clef}:${r.pitch}`
    const entry = times.get(key) ?? { pitch: r.pitch, clef: r.clef, list: [] }
    entry.list.push(r.ms)
    times.set(key, entry)
  }
  const slowest = [...times.values()]
    .map(({ pitch, clef, list }) => ({
      pitch,
      clef,
      averageMs: list.reduce((a, b) => a + b, 0) / list.length,
    }))
    .sort((a, b) => b.averageMs - a.averageMs)
    .slice(0, 5)
  const clean = count('clean')
  return {
    clean,
    errors: count('error'),
    missed: count('missed'),
    accuracy: results.length === 0 ? 0 : clean / results.length,
    slowest,
  }
}
