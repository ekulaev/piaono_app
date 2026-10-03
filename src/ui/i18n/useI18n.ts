import { createContext, useContext } from 'react'
import { DEFAULT_LOCALE, translate, type Locale, type MessageKey, type Params } from '../../i18n'

export interface I18n {
  language: string
  locale: Locale
  t: (key: MessageKey, params?: Params) => string
  /** «2,1 с» / «2.1 s» по среднему времени в мс. */
  seconds: (ms: number) => string
  /** «58 %» / «58%» по доле 0–1. */
  percent: (share: number) => string
  /** Дата сборки в формате языка. */
  date: (iso: string) => string
  selectLanguage: (code: string) => void
}

/** Вне провайдера (тесты компонентов) — английский: чтобы не падать, как и при потерянном тексте. */
const FALLBACK: I18n = {
  language: DEFAULT_LOCALE.code,
  locale: DEFAULT_LOCALE,
  t: (key, params) => translate(DEFAULT_LOCALE, DEFAULT_LOCALE, key, params),
  seconds: (ms) => `${(ms / 1000).toFixed(1)} s`,
  percent: (share) => `${Math.round(share * 100)}%`,
  date: (iso) => iso,
  selectLanguage: () => {},
}

export const I18nContext = createContext<I18n>(FALLBACK)

export const useI18n = () => useContext(I18nContext)

/** Короткий путь к поиску текста: `const t = useT()`. */
export const useT = () => useContext(I18nContext).t
