// Гаснущие подсказки «якорь + интервал» (C-STF-3): что видно на каждом уровне и как уровень
// меняется от успехов и трудностей. Чистые функции — React и хранилища здесь нет.

import type { Clef } from '../staff/pickNote'

/** 3 — все подсказки, 0 — никаких. */
export type HintLevel = 0 | 1 | 2 | 3

export interface ClefProgress {
  level: HintLevel
  /** Успешных последовательностей подряд в этом ключе. */
  streak: number
}

/** Уровень у каждого ключа свой: скрипичный и басовый читаются по-разному. */
export type HintProgress = Record<Clef, ClefProgress>

/** Что показано над станом у текущей последовательности. */
export interface HintVisibility {
  anchor: boolean
  anchorLabel: boolean
  /** Подсказка интервала над каждым шагом. */
  steps: boolean[]
}

const MAX_LEVEL: HintLevel = 3
/** Столько успешных последовательностей подряд снижают уровень на 1 (калибруется, C-STF-3 В-1). */
export const SUCCESSES_TO_FADE = 2
/** Трудная — шагов с ошибкой и пропущенных больше этой доли (калибруется, C-STF-3 В-1). */
export const HARD_SHARE = 0.5

export const DEFAULT_HINT_PROGRESS: HintProgress = {
  treble: { level: MAX_LEVEL, streak: 0 },
  bass: { level: MAX_LEVEL, streak: 0 },
}

/** Видимость в начале последовательности по уровню её ключа. */
export function initialVisibility(level: HintLevel, stepCount: number): HintVisibility {
  return {
    anchor: level >= 1,
    anchorLabel: level === 3,
    steps: Array.from({ length: stepCount }, (_, i) => level >= 2 || (level === 1 && i === 0)),
  }
}

/**
 * После ошибки на шаге его подсказка появляется и остаётся до конца последовательности.
 * У первого шага подсказка — от якоря, поэтому появляются и якорь с подписью.
 */
export function revealStep(visibility: HintVisibility, stepIndex: number): HintVisibility {
  const steps = visibility.steps.map((shown, i) => shown || i === stepIndex)
  if (stepIndex === 0) return { anchor: true, anchorLabel: true, steps }
  return { ...visibility, steps }
}

/** Минимум из записи шага, нужный для оценки последовательности. */
interface StepOutcome {
  result: 'pending' | 'correct' | 'skipped'
  hadError: boolean
}

export type SequenceOutcome = 'success' | 'hard' | 'other'

export function classify(records: readonly StepOutcome[]): SequenceOutcome {
  const troubled = records.filter((r) => r.result === 'skipped' || r.hadError).length
  if (troubled === 0) return 'success'
  if (troubled > records.length * HARD_SHARE) return 'hard'
  return 'other'
}

/** Уровни после завершённой последовательности ключа clef. */
export function nextProgress(
  progress: HintProgress,
  clef: Clef,
  records: readonly StepOutcome[],
): HintProgress {
  const { level, streak } = progress[clef]
  let next: ClefProgress
  switch (classify(records)) {
    case 'success':
      next =
        streak + 1 >= SUCCESSES_TO_FADE
          ? { level: Math.max(0, level - 1) as HintLevel, streak: 0 }
          : { level, streak: streak + 1 }
      break
    case 'hard':
      next = { level: Math.min(MAX_LEVEL, level + 1) as HintLevel, streak: 0 }
      break
    case 'other':
      next = { level, streak: 0 }
  }
  return { ...progress, [clef]: next }
}

function readClef(value: unknown): ClefProgress {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const level = saved.level
  const streak = saved.streak
  const validLevel = level === 0 || level === 1 || level === 2 || level === 3
  const validStreak = Number.isInteger(streak) && (streak as number) >= 0
  // Уровень без правильного счёта (и наоборот) — повреждённые данные: начинаем заново.
  return validLevel && validStreak
    ? { level, streak: streak as number }
    : { ...DEFAULT_HINT_PROGRESS.treble }
}

/** Сохранённые уровни: каждый повреждённый ключ — уровень 3 и нулевой счёт. */
export function readHintProgress(value: unknown): HintProgress {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return { treble: readClef(saved.treble), bass: readClef(saved.bass) }
}
