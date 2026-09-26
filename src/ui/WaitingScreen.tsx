import type { ReactNode } from 'react'
import type { ConnectionState, MidiDeviceInfo } from '../midi/types'
import ConnectionStatus from './ConnectionStatus'
import './WaitingScreen.css'

/** Кнопка, которая на время упражнения встаёт на место «Проверки пианино». */
export interface SlotButton {
  label: string
  onClick: () => void
}

interface Props {
  connectionState: ConnectionState
  devices: MidiDeviceInfo[]
  /** Устройство, чьи ноты сейчас принимаются. */
  activeDeviceId: string | null
  updateReady: boolean
  onRetry: () => void
  onOpenCheck: () => void
  onApplyUpdate: () => void
  exerciseRunning: boolean
  onToggleExercise: () => void
  /** Название активного режима — на кнопке «Режим: …». */
  activeModeTitle: string
  onOpenModes: () => void
  /** «Пропустить» / «Далее (N)»; null — на месте «Проверка пианино». */
  slotButton: SlotButton | null
  /** Нотный стан: между подсказкой и кнопками, занимает всё свободное место. */
  staff: ReactNode
  /** Экранная клавиатура: видна внизу во всех состояниях связи. */
  keyboard: ReactNode
}

/** Подсказка «что делать» для каждого состояния, кроме «на связи». */
function Hint({ state }: { state: ConnectionState }) {
  switch (state) {
    case 'unsupported':
      return <p className="hint">Открой приложение в Chrome.</p>
    case 'permission-denied':
      return (
        <p className="hint">
          Нажми на значок замка рядом с адресом (в установленном приложении — «Настройки сайта»),
          разреши MIDI-устройства и нажми «Попробовать снова».
        </p>
      )
    case 'connecting':
      return <p className="hint">Если браузер спросит про MIDI-устройства — нажми «Разрешить».</p>
    case 'no-device':
      return (
        <ol className="hint hint--steps">
          <li>Включи пианино.</li>
          <li>Подключи его USB-кабелем к планшету (через переходник, если нужно).</li>
          <li>Подожди пару секунд.</li>
        </ol>
      )
    case 'lost':
      return (
        <p className="hint">
          Проверь, что кабель на месте и пианино включено. Как только оно появится, всё продолжится
          само.
        </p>
      )
    case 'connected':
      return null
  }
}

/**
 * Главный экран сверху вниз: индикатор связи, строка подсказки, нотный стан, кнопки,
 * клавиатура. Ноты — единственный крупный объект: имени сыгранной ноты здесь нет.
 */
function WaitingScreen({
  connectionState,
  devices,
  activeDeviceId,
  updateReady,
  onRetry,
  onOpenCheck,
  onApplyUpdate,
  exerciseRunning,
  onToggleExercise,
  activeModeTitle,
  onOpenModes,
  slotButton,
  staff,
  keyboard,
}: Props) {
  const isConnected = connectionState === 'connected'

  return (
    <div className="waiting-screen">
      <main className="waiting">
        <ConnectionStatus state={connectionState} />

        {/* Если подсказка не влезает (телефон), прокручивается только она. */}
        <section className="waiting__message">
          {isConnected ? (
            <>
              <p className="waiting__device">
                {devices.find((device) => device.id === activeDeviceId)?.name}
              </p>
              {devices.length > 1 && (
                <p className="waiting__device-hint">
                  Устройств несколько — выбрать можно в «Проверке пианино»
                </p>
              )}
              <p className="waiting__invite">Нажми «Старт»</p>
            </>
          ) : (
            <Hint state={connectionState} />
          )}
        </section>

        {staff}

        <nav className="waiting__actions">
          {/* Число кнопок в ряду не меняется: слот занимает место «Проверки пианино». */}
          {slotButton ? (
            <button type="button" className="button waiting__slot" onClick={slotButton.onClick}>
              {slotButton.label}
            </button>
          ) : (
            <button type="button" className="button waiting__slot" onClick={onOpenCheck}>
              Проверка пианино
            </button>
          )}
          <button
            type="button"
            className="button button--primary waiting__start"
            onClick={onToggleExercise}
          >
            {exerciseRunning ? 'Стоп' : 'Старт'}
          </button>
          <button type="button" className="button waiting__mode" onClick={onOpenModes}>
            Режим: {activeModeTitle}
          </button>
          {connectionState === 'permission-denied' && (
            <button type="button" className="button button--primary" onClick={onRetry}>
              Попробовать снова
            </button>
          )}
          {updateReady && (
            <button type="button" className="button waiting__update" onClick={onApplyUpdate}>
              Обновить сейчас
            </button>
          )}
        </nav>
      </main>
      <div className="waiting-screen__keyboard">{keyboard}</div>
    </div>
  )
}

export default WaitingScreen
