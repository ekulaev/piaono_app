// Перечень режимов упражнения. Порядок массива — порядок в меню режимов.
// Названия режимов — в файлах перевода (C-APP-3), движок их не знает.
// В массиве только доступные (реализованные) режимы: чего здесь нет, того нет и в меню.

export type ModeId = 'sequences' | 'contour' | 'rhythm' | 'warmup' | 'intervals'

export interface ModeInfo {
  id: ModeId
  /** Есть ли у режима настройки на экране режима. */
  hasSettings: boolean
}

export const MODES: readonly ModeInfo[] = [
  { id: 'sequences', hasSettings: true },
  { id: 'contour', hasSettings: true },
  { id: 'rhythm', hasSettings: true },
  { id: 'warmup', hasSettings: true },
  // Сольфеджио (M-SOL): первый режим на ядре заданий (C-SOL-1, C-SOL-2).
  { id: 'intervals', hasSettings: true },
]

/** С этого режима начинает новый пользователь; к нему же возвращаемся при битых данных. */
export const DEFAULT_MODE: ModeId = 'warmup'

export function isModeId(value: unknown): value is ModeId {
  return MODES.some((mode) => mode.id === value)
}

export function modeInfo(id: ModeId): ModeInfo {
  return MODES.find((mode) => mode.id === id) ?? MODES[0]
}
