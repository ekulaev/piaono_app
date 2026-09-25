// Публичный контракт движка клавиатуры. Движок не знает ни про React, ни про сырой MIDI:
// на вход — нажатия с пианино и касания экрана, на выход — состояние клавиш и сыгранные ноты.

/** Уровень интенсивности нажатия: 1 — тихо, 2 — средне, 3 — громко. */
export type Level = 1 | 2 | 3

/** Откуда пришло нажатие. Для отображения источник не важен, но движку нужен (пианино главнее). */
export type NoteSource = 'piano' | 'touch'

/** Всё, что может изменить состояние клавиатуры. */
export type KeyInput =
  | { kind: 'pianoDown'; pitch: number; velocity: number }
  | { kind: 'pianoUp'; pitch: number }
  /** Связь с пианино пропала: всё, что держали на пианино, считаем отпущенным. */
  | { kind: 'pianoReset' }
  | { kind: 'touchDown'; pointerId: number; pitch: number; pressure: number }
  /** Палец сдвинулся; pitch — клавиша под ним сейчас или null, если палец вне клавиш. */
  | { kind: 'touchMove'; pointerId: number; pitch: number | null }
  | { kind: 'touchUp'; pointerId: number }
  | { kind: 'setGlissando'; enabled: boolean }

/** Один палец на экране. */
export interface TouchHold {
  pitch: number
  level: Level
  /**
   * Клавишу этого пальца отпустили на пианино (пианино главнее касания). Пока палец не
   * оторван, он больше не держит клавишу.
   */
  cancelled: boolean
}

export interface KeyboardState {
  /** Ноты, удерживаемые на пианино: pitch (0..127) → velocity. */
  piano: ReadonlyMap<number, number>
  /** Пальцы на экране: pointerId → что держит. */
  touches: ReadonlyMap<number, TouchHold>
  glissando: boolean
}

/** Нажатие, которое приложение засчитывает как ответ ученика. */
export interface PlayedNote {
  pitch: number
  level: Level
  source: NoteSource
}
