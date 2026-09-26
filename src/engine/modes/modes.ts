// Перечень режимов упражнения. Порядок массива — порядок в меню режимов.
// В массиве только доступные (реализованные) режимы: чего здесь нет, того нет и в меню.

export type ModeId = 'sequences' | 'warmup'

export interface ModeInfo {
  id: ModeId
  title: string
  /** Есть ли у режима настройки на экране режима. */
  hasSettings: boolean
}

export const MODES: readonly ModeInfo[] = [
  { id: 'sequences', title: 'Последовательности', hasSettings: true },
  { id: 'warmup', title: 'Разминка', hasSettings: false },
]

/** С этого режима начинает новый пользователь; к нему же возвращаемся при битых данных. */
export const DEFAULT_MODE: ModeId = 'warmup'

export function isModeId(value: unknown): value is ModeId {
  return MODES.some((mode) => mode.id === value)
}

export function modeInfo(id: ModeId): ModeInfo {
  return MODES.find((mode) => mode.id === id) ?? MODES[0]
}
