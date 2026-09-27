import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

interface Props {
  /** Вопрос: что именно будет стёрто или изменено. */
  question: string
  /** Пояснение под вопросом. */
  details?: string
  onYes: () => void
  onNo: () => void
}

/**
 * Подтверждение критичного действия «Да / Нет» (C-STF-7). Встроенный <dialog> в модальном режиме
 * сам держит фокус внутри и закрывается по Esc. Фокус сначала на безопасном «Нет»; Esc и касание
 * вне окна — тоже «Нет». Появляется сразу, без анимации. Поверх упражнения не открывается:
 * вызывается только с экранов «Прогресс» и «Настройки».
 */
function ConfirmDialog({ question, details, onYes, onNo }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const noRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    noRef.current?.focus()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="confirm"
      aria-labelledby="confirm-question"
      // Esc: браузер шлёт cancel — отвечаем «Нет» сами, чтобы закрытие шло через состояние.
      onCancel={(event) => {
        event.preventDefault()
        onNo()
      }}
      // Касание затемнения попадает в сам <dialog>, а не в его содержимое.
      onClick={(event) => {
        if (event.target === event.currentTarget) onNo()
      }}
    >
      <div className="confirm__body">
        <p id="confirm-question" className="confirm__question">
          {question}
        </p>
        {details && <p className="confirm__details">{details}</p>}
        <div className="confirm__actions">
          <button ref={noRef} type="button" className="button" onClick={onNo}>
            Нет
          </button>
          <button type="button" className="button button--primary" onClick={onYes}>
            Да
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default ConfirmDialog
