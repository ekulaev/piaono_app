import type { ReactNode } from 'react'
import './WaitingScreen.css'
import { useT } from './i18n/useI18n'

/** Кнопка по ходу упражнения — в слоте слева от «Старт». */
export interface SlotButton {
  label: string
  onClick: () => void
}

interface Props {
  exerciseRunning: boolean
  onToggleExercise: () => void
  /** Название активного режима — на кнопке «Режим: …». */
  activeModeTitle: string
  onOpenModes: () => void
  /** Меню режимов открыто: кнопка режима недоступна, чтобы меню не открылось повторно. */
  modeMenuOpen: boolean
  /** «?» с подсказкой активного режима — сразу справа от «Режим: …» (C-APP-2, OB-10). */
  modeHint: ReactNode
  /** Быстрая настройка активного режима на главном экране (флажок «Последовательностей»). */
  modeControl: ReactNode
  /** «Пропустить» / «Сначала» / «Далее (N)»; null — слот пуст, но место за ним держится. */
  slotButton: SlotButton | null
  /** Нотный стан (или итог, или приглашение): занимает всё свободное место над кнопками. */
  staff: ReactNode
  /** Экранная клавиатура: видна внизу во всех состояниях связи. */
  keyboard: ReactNode
}

/**
 * Главный экран под верхней панелью: нотный стан, ряд кнопок, клавиатура (C-APP-1, OB-6).
 * Всё про связь и приложение — в панели и в «Настройках»: ноты — единственный крупный объект.
 */
function WaitingScreen({
  exerciseRunning,
  onToggleExercise,
  activeModeTitle,
  onOpenModes,
  modeMenuOpen,
  modeHint,
  modeControl,
  slotButton,
  staff,
  keyboard,
}: Props) {
  const t = useT()
  return (
    <div className="waiting-screen">
      <main className="waiting">
        {staff}

        <nav className="waiting__actions">
          {/* Слот держит место и без кнопки: «Старт» и «Режим» не сдвигаются при запуске. */}
          {slotButton ? (
            <button type="button" className="button waiting__slot" onClick={slotButton.onClick}>
              {slotButton.label}
            </button>
          ) : (
            <span className="button waiting__slot waiting__slot--empty" aria-hidden="true" />
          )}
          <button
            type="button"
            className="button button--primary waiting__start"
            onClick={onToggleExercise}
          >
            {exerciseRunning ? t('main.stop') : t('main.start')}
          </button>
          {/* «Режим» и «?» не разрываются при переносе ряда: «?» всегда сразу справа. */}
          <span className="waiting__mode-group">
            <button
              type="button"
              className="button waiting__mode"
              // aria-disabled, а не disabled: заблокированная кнопка остаётся в фокусе, и меню
              // вернёт фокус на неё при закрытии.
              onClick={modeMenuOpen ? undefined : onOpenModes}
              aria-disabled={modeMenuOpen}
              aria-expanded={modeMenuOpen}
            >
              {t('main.mode', { mode: activeModeTitle })}
            </button>
            {modeHint}
          </span>
        </nav>
        {modeControl && <div className="waiting__mode-control">{modeControl}</div>}
      </main>
      <div className="waiting-screen__keyboard">{keyboard}</div>
    </div>
  )
}

export default WaitingScreen
