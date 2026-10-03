import { useEffect, useMemo, type ReactNode } from 'react'
import {
  DEFAULT_LOCALE,
  findLocale,
  formatDate,
  formatSeconds,
  translate,
  type MessageKey,
  type Params,
} from '../../i18n'
import { I18nContext, type I18n } from './useI18n'

interface Props {
  /** Код языка приложения — владелец решает, откуда он (выбор ученика или язык системы). */
  language: string
  onSelectLanguage: (code: string) => void
  children: ReactNode
}

/**
 * Язык приложения для всего дерева (C-APP-3). Смена языка перерисовывает тексты на месте:
 * экраны, MIDI-подписка и упражнение не пересоздаются (OB-4, OB-12).
 */
function I18nProvider({ language, onSelectLanguage, children }: Props) {
  const locale = findLocale(language) ?? DEFAULT_LOCALE

  const value = useMemo<I18n>(() => {
    const t = (key: MessageKey, params?: Params) => translate(locale, DEFAULT_LOCALE, key, params)
    return {
      language: locale.code,
      locale,
      t,
      seconds: (ms) => t('format.seconds', { value: formatSeconds(locale.code, ms) }),
      percent: (share) => t('format.percent', { value: Math.round(share * 100) }),
      date: (iso) => formatDate(locale.code, iso),
      selectLanguage: onSelectLanguage,
    }
  }, [locale, onSelectLanguage])

  // Заголовок вкладки, описание страницы и язык документа — на языке приложения (OB-11).
  const { t } = value
  useEffect(() => {
    document.documentElement.lang = locale.code
    document.title = t('meta.title')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t('meta.description'))
  }, [locale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export default I18nProvider
