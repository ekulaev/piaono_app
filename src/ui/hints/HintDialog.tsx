import { useEffect, useRef } from 'react'
import HintNotes from './HintNotes'
import type { Hint } from './hints'
import './HintDialog.css'

interface Props {
  hint: Hint
  onClose: () => void
}

/**
 * Окно подсказки (C-APP-2): 80 % ширины, высота по содержимому, но не больше 80 % экрана.
 * Шапка с «Закрыть» не прокручивается; прокручивается только содержимое и только по вертикали.
 * Встроенный модальный <dialog> держит фокус внутри и закрывается по Esc / системной «Назад»;
 * касание затемнения — тоже закрытие. Появляется сразу, без анимации.
 */
function HintDialog({ hint, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    closeRef.current?.focus()
    return () => dialog.close()
  }, [])

  // Сначала закрываем само окно: пока модальное окно открыто, экран под ним недоступен и фокус
  // нельзя вернуть на кнопку «?».
  const close = () => {
    dialogRef.current?.close()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="hint"
      aria-labelledby="hint-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      // Esc закрывает только подсказку, а не окно под ней (например, меню режимов).
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation()
      }}
      // Касание затемнения попадает в сам <dialog>, а не в его содержимое.
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="hint__frame">
        <header className="hint__header">
          <h2 id="hint-title" className="hint__title">
            {hint.title}
          </h2>
          <button ref={closeRef} type="button" className="button" onClick={close}>
            <span aria-hidden="true">×</span> Закрыть
          </button>
        </header>
        <div className="hint__body">
          {hint.blocks.map((block, index) => {
            switch (block.kind) {
              case 'text':
                return <p key={index}>{block.text}</p>
              case 'steps':
                return (
                  <ol key={index} className="hint__steps">
                    {block.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                )
              case 'image':
                return (
                  <figure key={index} className="hint__figure">
                    <img src={block.src} alt="" />
                    <figcaption>{block.caption}</figcaption>
                  </figure>
                )
              default:
                return <HintNotes key={index} block={block} />
            }
          })}
        </div>
      </div>
    </dialog>
  )
}

export default HintDialog
