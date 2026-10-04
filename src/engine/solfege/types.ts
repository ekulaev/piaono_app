// Задание сольфеджио (C-SOL-1): что показано, какой ответ верный и как его проверять.
// Ядро не знает содержания режима: интервалы, длительности, гаммы — это content режима.

/** Режимы сольфеджио. Пока один (C-SOL-2). */
export type SolfegeModeId = 'intervals'

/**
 * Ответ-нота: нужно сыграть именно эти ноты, с октавой, по порядку (C-SOL-1, OB-3). Одна нота —
 * короткий ответ, оценка сразу; несколько — длинный, оценка после последней (OB-5, OB-6).
 */
export interface NoteAnswer {
  kind: 'note'
  pitches: readonly number[]
}

/**
 * Ответ-значение: клавиша означает вариант ответа по таблице режима, октава не важна
 * (C-SOL-1, OB-4). table — ступень звукоряда от «до» (0–11) → значение.
 */
export interface ValueAnswer {
  kind: 'value'
  value: string
  table: Readonly<Record<number, string>>
}

export type Answer = NoteAnswer | ValueAnswer

/** Нижняя и верхняя ноты, которые нужно видеть на клавиатуре для ответа. */
export interface PitchRange {
  low: number
  high: number
}

export interface Task<Content = unknown> {
  /** Режим-источник: по нему пишется статистика и берётся вид (C-SOL-1, INV-5). */
  mode: SolfegeModeId
  /** Тип задания — ключ статистики (C-SOL-1, OB-16). */
  type: string
  answer: Answer
  /** Что нужно видеть на клавиатуре для ответа (авто-сдвиг, OB-13). */
  range: PitchRange
  /** Содержание режима: что нарисовать и написать. */
  content: Content
}

/** Исход завершённого задания (C-SOL-1, «Исход задания»). */
export type TaskOutcome = 'clean' | 'error' | 'skip'

export interface TaskRecord {
  outcome: TaskOutcome
  /** От появления задания до верного ответа; только у «верно сразу». */
  ms: number | null
  /** Неверных попыток до верного ответа или пропуска. */
  errors: number
}
