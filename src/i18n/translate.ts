import type { Locale, Message, Params, PluralMessage } from './types'

/** Язык по умолчанию и запасной (C-APP-3, Р-2, Р-7). */
export const DEFAULT_LANGUAGE = 'en'

/** Форма числительного для языка и числа: `Intl.PluralRules` знает правила каждого языка. */
export function pluralForm(code: string, n: number): keyof PluralMessage {
  const category = new Intl.PluralRules(code).select(n)
  switch (category) {
    case 'one':
    case 'few':
    case 'many':
      return category
    default:
      return 'other'
  }
}

function pick(message: Message, code: string, params?: Params): string {
  if (typeof message === 'string') return message
  const n = typeof params?.n === 'number' ? params.n : 0
  return message[pluralForm(code, n)] ?? message.other
}

function fill(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  )
}

/**
 * Текст по ключу: из выбранного языка, иначе из английского (OB-8, INV-3). Если нет и в английском —
 * сам ключ: в готовом приложении этого быть не может (тест сверяет наборы ключей), но экран
 * не должен падать.
 */
export function translate(locale: Locale, fallback: Locale, key: string, params?: Params): string {
  const own = locale.messages[key]
  if (own !== undefined) return fill(pick(own, locale.code, params), params)
  const base = fallback.messages[key]
  if (base !== undefined) return fill(pick(base, fallback.code, params), params)
  return key
}
