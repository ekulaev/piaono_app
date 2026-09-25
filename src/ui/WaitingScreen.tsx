import type { ReactNode } from 'react'
import type { ConnectionState, MidiDeviceInfo } from '../midi/types'
import ConnectionStatus from './ConnectionStatus'
import './WaitingScreen.css'

interface Props {
  connectionState: ConnectionState
  devices: MidiDeviceInfo[]
  /** Имя последней нажатой ноты («C4») или null, если ещё ничего не играли. */
  lastNoteName: string | null
  updateReady: boolean
  onRetry: () => void
  onOpenCheck: () => void
  onApplyUpdate: () => void
  /** Экранная клавиатура: видна внизу во всех состояниях связи. */
  keyboard: ReactNode
}

/** Подсказка «что делать» для каждого состояния, кроме «на связи» (там — нота). */
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

/** Главный экран: состояние связи с пианино, что делать дальше и клавиатура внизу. */
function WaitingScreen({
  connectionState,
  devices,
  lastNoteName,
  updateReady,
  onRetry,
  onOpenCheck,
  onApplyUpdate,
  keyboard,
}: Props) {
  const isConnected = connectionState === 'connected'

  return (
    <div className="waiting-screen">
      <main className="waiting">
        <ConnectionStatus state={connectionState} />

        {/* На низком экране (телефон) не влезающее прокручивается здесь, а индикатор
            и клавиатура остаются на месте. */}
        <div className="waiting__scroll">
          <section className="waiting__body">
            {isConnected ? (
              <>
                <p className="waiting__device">{devices.map((device) => device.name).join(', ')}</p>
                <p className="waiting__invite">Сыграй любую ноту</p>
                <p className="waiting__note" aria-live="polite">
                  {lastNoteName}
                </p>
              </>
            ) : (
              <Hint state={connectionState} />
            )}
          </section>

          <nav className="waiting__actions">
            <button type="button" className="button" onClick={onOpenCheck}>
              Проверка пианино
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
        </div>
      </main>
      <div className="waiting-screen__keyboard">{keyboard}</div>
    </div>
  )
}

export default WaitingScreen
