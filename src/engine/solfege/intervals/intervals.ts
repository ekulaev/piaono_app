// Интервалы режима «Интервалы» (C-SOL-2): двенадцать от малой секунды до октавы.
// Прима в заданиях не встречается (Р-10). Названия — в файлах перевода по идентификатору.

/** Идентификатор интервала: качество латиницей и номер ступени, как в английских названиях. */
export type IntervalId =
  'm2' | 'M2' | 'm3' | 'M3' | 'P4' | 'TT' | 'P5' | 'm6' | 'M6' | 'm7' | 'M7' | 'P8'

export interface IntervalInfo {
  id: IntervalId
  /** Полутонов между нотами. */
  semitones: number
  /**
   * Ступеней между нотами по записи (терция — 2, октава — 7). У тритона два написания —
   * ув4 (3 ступени) и ум5 (4), выбирается при записи второй ноты (spell.ts).
   */
  steps: number
}

export const INTERVALS: readonly IntervalInfo[] = [
  { id: 'm2', semitones: 1, steps: 1 },
  { id: 'M2', semitones: 2, steps: 1 },
  { id: 'm3', semitones: 3, steps: 2 },
  { id: 'M3', semitones: 4, steps: 2 },
  { id: 'P4', semitones: 5, steps: 3 },
  { id: 'TT', semitones: 6, steps: 3 },
  { id: 'P5', semitones: 7, steps: 4 },
  { id: 'm6', semitones: 8, steps: 5 },
  { id: 'M6', semitones: 9, steps: 5 },
  { id: 'm7', semitones: 10, steps: 6 },
  { id: 'M7', semitones: 11, steps: 6 },
  { id: 'P8', semitones: 12, steps: 7 },
]

export const INTERVAL_IDS: readonly IntervalId[] = INTERVALS.map((i) => i.id)

export function intervalInfo(id: IntervalId): IntervalInfo {
  return INTERVALS.find((i) => i.id === id)!
}

export type Direction = 'up' | 'down'

/** Вариант задания: «Сыграй интервал» (play) или «Узнай интервал» (name). */
export type Variant = 'play' | 'name'

/** Тип задания для статистики (Р-12): вариант, направление и интервал — «name:down:TT». */
export type IntervalTaskType = `${Variant}:${Direction}:${IntervalId}`

export function taskType(variant: Variant, direction: Direction, id: IntervalId): IntervalTaskType {
  return `${variant}:${direction}:${id}`
}

const TASK_TYPE = new RegExp(`^(play|name):(up|down):(${INTERVAL_IDS.join('|')})$`)

export function isIntervalTaskType(value: string): value is IntervalTaskType {
  return TASK_TYPE.test(value)
}

export function parseTaskType(type: IntervalTaskType): {
  variant: Variant
  direction: Direction
  id: IntervalId
} {
  const [variant, direction, id] = type.split(':') as [Variant, Direction, IntervalId]
  return { variant, direction, id }
}

/** Все 48 типов заданий. */
export const ALL_TASK_TYPES: readonly IntervalTaskType[] = (['play', 'name'] as const).flatMap(
  (variant) =>
    (['up', 'down'] as const).flatMap((direction) =>
      INTERVAL_IDS.map((id) => taskType(variant, direction, id)),
    ),
)
