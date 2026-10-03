import { useEffect, useRef, useState } from 'react'
import { LOCALES } from '../../i18n'
import { Flag } from '../icons/Flags'
import { useI18n } from '../i18n/useI18n'
import './LanguageMenu.css'

/**
 * Кнопка языка в верхней панели и выпадающий список языков (C-APP-3, OB-1…OB-3, OB-12).
 * Выбор применяется сразу и закрывает список; упражнение не прерывается.
 */
function LanguageMenu() {
  const { t, locale, selectLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    // Касание вне списка закрывает его, но само касание не гасим: нота под пальцем играет сразу
    // (CLAUDE.md §5 — отклик ≤ ~50 мс), а не уходит на закрытие.
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const label = t('language.button', { name: locale.name })
  return (
    <div className="language" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="button topbar__button language__button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen(!open)}
      >
        <Flag id={locale.flag} code={locale.code} />
        <span className="topbar__label">{locale.code.toUpperCase()}</span>
      </button>
      {open && (
        <ul className="language__list" aria-label={t('language.list')}>
          {LOCALES.map((item) => {
            const current = item.code === locale.code
            return (
              <li key={item.code}>
                <button
                  type="button"
                  className={`language__item${current ? ' language__item--current' : ''}`}
                  lang={item.code}
                  aria-pressed={current}
                  onClick={() => {
                    setOpen(false)
                    buttonRef.current?.focus()
                    selectLanguage(item.code)
                  }}
                >
                  <Flag id={item.flag} code={item.code} />
                  <span className="language__name">{item.name}</span>
                  {current && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default LanguageMenu
