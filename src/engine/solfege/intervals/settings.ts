// Настройки режима «Интервалы» (C-SOL-2, «Настройки»): что тренировать, сколько заданий,
// переход сам. Авто-сдвиг в режиме обязательный — флажка нет (OB-9).

export type VariantChoice = 'play' | 'name' | 'both'

export interface IntervalsSettings {
  variant: VariantChoice
  /** Заданий в сессии (C-SOL-1, LIM-4). */
  tasks: number
  /** После задания — отсчёт 3 секунды и переход сам. */
  autoAdvance: boolean
}

export const TASKS_LIMITS = { min: 1, max: 10 }

export const DEFAULT_INTERVALS_SETTINGS: IntervalsSettings = {
  variant: 'both',
  tasks: 10,
  autoAdvance: false,
}

const VARIANTS: readonly VariantChoice[] = ['play', 'name', 'both']

/** Сохранённые настройки: отсутствующее или повреждённое поле — значение по умолчанию. */
export function readIntervalsSettings(value: unknown): IntervalsSettings {
  const d = DEFAULT_INTERVALS_SETTINGS
  if (typeof value !== 'object' || value === null) return d
  const saved = value as Record<string, unknown>
  const tasks = saved.tasks
  return {
    variant: VARIANTS.includes(saved.variant as VariantChoice)
      ? (saved.variant as VariantChoice)
      : d.variant,
    tasks:
      Number.isInteger(tasks) &&
      (tasks as number) >= TASKS_LIMITS.min &&
      (tasks as number) <= TASKS_LIMITS.max
        ? (tasks as number)
        : d.tasks,
    autoAdvance: typeof saved.autoAdvance === 'boolean' ? saved.autoAdvance : d.autoAdvance,
  }
}
