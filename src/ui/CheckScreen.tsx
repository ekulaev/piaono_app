import { pitchToNoteName } from '../midi/noteNames'
import type { ConnectionState, MidiDeviceInfo, MidiNoteEvent } from '../midi/types'
import ConnectionStatus from './ConnectionStatus'
import './CheckScreen.css'

export interface LogEntry {
  id: number
  event: MidiNoteEvent
}

interface Props {
  connectionState: ConnectionState
  devices: MidiDeviceInfo[]
  log: LogEntry[]
  glissando: boolean
  onToggleGlissando: () => void
  onBack: () => void
}

/**
 * «Проверка пианино» — диагностический экран (бывший MIDI-монитор этапа 0):
 * какие устройства видны и какие ноты приходят.
 */
function CheckScreen({
  connectionState,
  devices,
  log,
  glissando,
  onToggleGlissando,
  onBack,
}: Props) {
  return (
    <main className="check">
      <header className="check__header">
        <button type="button" className="button" onClick={onBack}>
          Назад
        </button>
        <h1>Проверка пианино</h1>
        {/* Временное место, пока нет экрана настроек (этап 8). */}
        <button
          type="button"
          className="button check__glissando"
          aria-pressed={glissando}
          onClick={onToggleGlissando}
        >
          Глиссандо: {glissando ? 'вкл' : 'выкл'}
        </button>
      </header>

      <ConnectionStatus state={connectionState} />

      <section className="devices">
        <h2>Подключённые устройства</h2>
        {devices.length === 0 ? (
          <p className="devices__empty">Пока ничего не найдено.</p>
        ) : (
          <ul className="devices__list">
            {devices.map((device) => (
              <li key={device.id}>{device.name}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="log">
        <h2>Ноты в реальном времени</h2>
        {log.length === 0 ? (
          <p className="log__empty">Сыграй ноту на пианино — она появится здесь.</p>
        ) : (
          <ul className="log__list">
            {log.map(({ id, event }) => (
              <li key={id} className={`log__entry log__entry--${event.type}`}>
                <span className="log__note">{pitchToNoteName(event.pitch)}</span>
                <span className="log__pitch">№{event.pitch}</span>
                <span className="log__kind">
                  {event.type === 'noteOn' ? 'нажата' : 'отпущена'}
                </span>
                {event.type === 'noteOn' && (
                  <span className="log__velocity">сила {event.velocity}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default CheckScreen
