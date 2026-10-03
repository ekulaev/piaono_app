// Типы слоя переводов (C-APP-3). Слой чистый: не знает ни про React, ни про engine/.

/** Идентификатор флага в списке языков; для языка без флага — `null` (показываем код). */
export type FlagId = 'ru' | 'gb'

/** Формы числительных: русский — one / few / many, английский — one / other. */
export interface PluralMessage {
  one?: string
  few?: string
  many?: string
  other: string
}

export type Message = string | PluralMessage

/** Параметры подстановки: `{name}` в тексте; `n` ещё и выбирает форму числительного. */
export type Params = Record<string, string | number>

/** Данные языка: сам перевод и то, что нужно списку языков. */
export interface Locale<M extends string = string> {
  /** Код языка (BCP 47, без региона): `ru`, `en` — совпадает с именем файла. */
  code: string
  /** Название на самом языке (OB-2). */
  name: string
  flag: FlagId | null
  /** Порядок в списке языков: меньше — выше; одинаковые — по коду. */
  order: number
  /** Перевод может быть неполным: чего нет — берётся из английского (OB-8). */
  messages: Partial<Record<M, Message>>
}
