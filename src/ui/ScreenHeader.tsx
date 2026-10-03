import { useEffect, useRef } from 'react'
import { HomeIcon } from './icons/Icons'
import './ScreenHeader.css'
import { useT } from './i18n/useI18n'

interface Props {
  title: string
  onBack: () => void
  /** Только на вложенных экранах (C-APP-1, OB-15): у первого уровня «Назад» уже ведёт домой. */
  onHome?: () => void
}

/**
 * Шапка отдельного экрана под верхней панелью: «Назад», заголовок и, на вложенном экране,
 * «Домой». Фокус клавиатуры при открытии — на «Назад»: сразу видно, где ты.
 */
function ScreenHeader({ title, onBack, onHome }: Props) {
  const t = useT()
  const backRef = useRef<HTMLButtonElement>(null)
  useEffect(() => backRef.current?.focus(), [])
  return (
    <header className="screen__header">
      <button ref={backRef} type="button" className="button" onClick={onBack}>
        <span aria-hidden="true">←</span> {t('header.back')}
      </button>
      <h1 className="screen__title">{title}</h1>
      {onHome && (
        <button
          type="button"
          className="button screen__home"
          title={t('header.home')}
          aria-label={t('header.home')}
          onClick={onHome}
        >
          <HomeIcon />
          <span className="screen__home-label">{t('header.home')}</span>
        </button>
      )}
    </header>
  )
}

export default ScreenHeader
