// Настройки режима «Длительности» (C-SOL-3, «Настройки»): что тренировать, сколько заданий,
// переход сам. Авто-сдвига у режима нет: ответ — клавиша в любой октаве (OB-8).

import { TASKS_LIMITS } from '../intervals/settings'

export type KindChoice = 'notes' | 'rests' | 'both'

export interface DurationsSettings {
  /** «Ноты» — ноты и группы, «Паузы» — паузы, «Ноты и паузы» — всё. */
  kinds: KindChoice
  /** Заданий в сессии (C-SOL-1, LIM-4). */
  tasks: number
  /** После задания — отсчёт 3 секунды и переход сам. */
  autoAdvance: boolean
}

export const DEFAULT_DURATIONS_SETTINGS: DurationsSettings = {
  kinds: 'both',
  tasks: 10,
  autoAdvance: false,
}

const KINDS: readonly KindChoice[] = ['notes', 'rests', 'both']

/** Сохранённые настройки: отсутствующее или повреждённое поле — значение по умолчанию. */
export function readDurationsSettings(value: unknown): DurationsSettings {
  const d = DEFAULT_DURATIONS_SETTINGS
  if (typeof value !== 'object' || value === null) return d
  const saved = value as Record<string, unknown>
  const tasks = saved.tasks
  return {
    kinds: KINDS.includes(saved.kinds as KindChoice) ? (saved.kinds as KindChoice) : d.kinds,
    tasks:
      Number.isInteger(tasks) &&
      (tasks as number) >= TASKS_LIMITS.min &&
      (tasks as number) <= TASKS_LIMITS.max
        ? (tasks as number)
        : d.tasks,
    autoAdvance: typeof saved.autoAdvance === 'boolean' ? saved.autoAdvance : d.autoAdvance,
  }
}
