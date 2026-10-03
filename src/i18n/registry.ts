import type { Locale } from './types'
import { DEFAULT_LANGUAGE } from './translate'

// Каждый файл в `locales/` — один язык; новый файл попадает в список без правки кода (OB-9).
// `eager` — все переводы в основном бандле, а значит и в офлайн-кеше (NFR-4).
const modules = import.meta.glob<{ default: Locale }>('./locales/*.ts', { eager: true })

export const LOCALES: Locale[] = Object.values(modules)
  .map((module) => module.default)
  .sort((a, b) => a.order - b.order || a.code.localeCompare(b.code))

export const AVAILABLE_LANGUAGES: string[] = LOCALES.map((locale) => locale.code)

export function findLocale(code: string): Locale | undefined {
  return LOCALES.find((locale) => locale.code === code)
}

/** Английский обязан быть: без него нечем заменить отсутствующий перевод. */
export const DEFAULT_LOCALE: Locale =
  findLocale(DEFAULT_LANGUAGE) ??
  (() => {
    throw new Error('Нет файла перевода locales/en.ts')
  })()
