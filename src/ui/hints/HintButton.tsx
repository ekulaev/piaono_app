import { useRef, useState } from 'react'
import { QuestionIcon } from '../icons/Icons'
import HintDialog from './HintDialog'
import { HINTS, type HintId } from './hints'
import './HintButton.css'
import { useT } from '../i18n/useI18n'

interface Props {
  id: HintId
  /** Где стоит кнопка: по умолчанию у правого края своего места (C-APP-2, OB-1). */
  placement?: 'end' | 'start' | 'inline'
  /**
   * Вызвать перед открытием окна. Нужно там, где может идти упражнение: окно подсказки никогда
   * не открывается поверх упражнения (OB-6).
   */
  beforeOpen?: () => void
}

/** Кнопка «?»: текст подсказки не виден, по касанию — окно подсказки. */
function HintButton({ id, placement = 'end', beforeOpen }: Props) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hint = HINTS[id]
  const t = useT()
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`hint-button hint-button--${placement}`}
        aria-label={t('hint.label', { title: t(hint.title) })}
        title={t('hint.label', { title: t(hint.title) })}
        onClick={() => {
          beforeOpen?.()
          setOpen(true)
        }}
      >
        <QuestionIcon />
      </button>
      {open && (
        <HintDialog
          hint={hint}
          onClose={() => {
            setOpen(false)
            // Фокус — туда, откуда открыли.
            buttonRef.current?.focus()
          }}
        />
      )}
    </>
  )
}

export default HintButton
