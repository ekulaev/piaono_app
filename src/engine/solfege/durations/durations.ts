// Длительности режима «Длительности» (C-SOL-3): пять длительностей, три рода знака, 12 типов
// заданий. Названия — в файлах перевода по типу задания; дроби одинаковы на всех языках.

/** Длительность: целая, 1/2, 1/4, 1/8, 1/16 — те же обозначения, что у VexFlow. */
export type DurationId = 'w' | 'h' | 'q' | '8' | '16'

export const DURATION_IDS: readonly DurationId[] = ['w', 'h', 'q', '8', '16']

/** Дробь в легенде и в оценке «✗ 1/8» (C-SOL-3, OB-7, OB-9). */
export const DURATION_FRACTION: Readonly<Record<DurationId, string>> = {
  w: '1',
  h: '1/2',
  q: '1/4',
  '8': '1/8',
  '16': '1/16',
}

/** Род знака: нота, пауза или группа нот под ребром (только восьмые и шестнадцатые). */
export type SignKind = 'note' | 'rest' | 'group'

/** Длительности, у которых бывает группа под ребром. */
type BeamableId = '8' | '16'

const BEAMABLE: readonly BeamableId[] = ['8', '16']

/** Тип задания для статистики (OB-12): род и длительность — «rest:h», «group:16». */
export type DurationTaskType = `${'note' | 'rest'}:${DurationId}` | `group:${BeamableId}`

/** Все 12 типов: 5 нот, 5 пауз, 2 группы. */
export const ALL_DURATION_TASK_TYPES: readonly DurationTaskType[] = [
  ...DURATION_IDS.map((d) => `note:${d}` as const),
  ...DURATION_IDS.map((d) => `rest:${d}` as const),
  ...BEAMABLE.map((d) => `group:${d}` as const),
]

export function isDurationTaskType(value: string): value is DurationTaskType {
  return (ALL_DURATION_TASK_TYPES as readonly string[]).includes(value)
}

export function parseDurationTaskType(type: DurationTaskType): {
  kind: SignKind
  duration: DurationId
} {
  const [kind, duration] = type.split(':') as [SignKind, DurationId]
  return { kind, duration }
}

/**
 * Коварные пары (OB-5, приложение Г): целая ↔ половинная пауза — прямоугольник висит под линией
 * или лежит на ней; восьмая ↔ шестнадцатая — один флажок или ребро против двух.
 */
const PAIRS: readonly [DurationTaskType, DurationTaskType][] = [
  ['rest:w', 'rest:h'],
  ['note:8', 'note:16'],
  ['rest:8', 'rest:16'],
  ['group:8', 'group:16'],
]

/** Пара типа задания или null, если тип не из коварной пары. */
export function pairOf(type: DurationTaskType): DurationTaskType | null {
  for (const [a, b] of PAIRS) {
    if (type === a) return b
    if (type === b) return a
  }
  return null
}
