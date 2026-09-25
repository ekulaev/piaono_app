import { pickNote, type StaffNote } from './pickNote'

/** Нота едет от правого края стана до ключа за это время. */
export const TRAVEL_MS = 5000
/** Столько нота показана верной или неверной. */
export const FLASH_MS = 500
/** Пауза с пустым станом между нотами. */
export const PAUSE_MS = 500
/** Нажатия в пределах этого окна от первого считаются одновременными (аккорд). */
export const GROUP_MS = 50

export type ExerciseState =
  | { phase: 'idle' }
  | {
      phase: 'moving'
      note: StaffNote
      appearedAt: number
      /** До какого момента нота показана неверной; null — не показана. */
      wrongUntil: number | null
      /** Открытая группа одновременных нажатий без верной ноты. */
      groupStartedAt: number | null
    }
  | { phase: 'correct'; note: StaffNote; progress: number; until: number }
  | { phase: 'pause'; until: number }

export const IDLE: ExerciseState = { phase: 'idle' }

/**
 * Упражнение как автомат. Все функции чистые, текущее время (мс, как performance.now)
 * передаётся параметром: логику можно проверить тестами без реального ожидания.
 * Моменты переходов берутся из расписания (appearedAt + TRAVEL_MS и т. п.), а не из
 * момента кадра, поэтому редкие кадры не копят ошибку тайминга.
 */
export function start(now: number, random: () => number): ExerciseState {
  return appear(now, random)
}

export function stop(): ExerciseState {
  return IDLE
}

function appear(at: number, random: () => number): ExerciseState {
  return {
    phase: 'moving',
    note: pickNote(random),
    appearedAt: at,
    wrongUntil: null,
    groupStartedAt: null,
  }
}

/** Нажатие клавиши. Без движущейся ноты ничего не меняет. */
export function played(state: ExerciseState, pitch: number, now: number): ExerciseState {
  if (state.phase !== 'moving') return state
  // Предыдущая группа могла закончиться, а кадра между ней и этим нажатием не было.
  const current = closeExpiredGroup(state, now)
  if (current.phase !== 'moving') return current

  if (pitch === current.note.pitch) {
    return {
      phase: 'correct',
      note: current.note,
      progress: progress(current, now),
      until: now + FLASH_MS,
    }
  }
  // Неверная клавиша открывает группу; внутри уже открытой группы ничего не меняет.
  if (current.groupStartedAt !== null) return current
  return { ...current, groupStartedAt: now }
}

/** Продвинуть автомат по времени: закрыть группу, погасить подсветку, сменить фазу. */
export function tick(state: ExerciseState, now: number, random: () => number): ExerciseState {
  let current = state
  // Цикл: после долгого перерыва между кадрами можно пройти несколько фаз подряд.
  for (;;) {
    const next = step(current, now, random)
    if (next === current) return current
    current = next
  }
}

function step(state: ExerciseState, now: number, random: () => number): ExerciseState {
  switch (state.phase) {
    case 'idle':
      return state
    case 'moving': {
      const arrivedAt = state.appearedAt + TRAVEL_MS
      if (
        state.groupStartedAt !== null &&
        state.groupStartedAt + GROUP_MS <= Math.min(now, arrivedAt)
      ) {
        return closeExpiredGroup(state, now)
      }
      if (now >= arrivedAt) return { phase: 'pause', until: arrivedAt + PAUSE_MS }
      if (state.wrongUntil !== null && now >= state.wrongUntil)
        return { ...state, wrongUntil: null }
      return state
    }
    case 'correct':
      return now >= state.until ? { phase: 'pause', until: state.until + PAUSE_MS } : state
    case 'pause':
      return now >= state.until ? appear(state.until, random) : state
  }
}

/** Группа без верной ноты закончилась: нота неверна ещё FLASH_MS после её конца. */
function closeExpiredGroup(state: ExerciseState & { phase: 'moving' }, now: number) {
  if (state.groupStartedAt === null || now < state.groupStartedAt + GROUP_MS) return state
  const groupEnd = state.groupStartedAt + GROUP_MS
  return { ...state, groupStartedAt: null, wrongUntil: groupEnd + FLASH_MS }
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
