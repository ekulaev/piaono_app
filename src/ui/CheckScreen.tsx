import { pitchToNoteName } from '../midi/noteNames'
import type { MidiNoteEvent } from '../midi/types'
import ScreenHeader from './ScreenHeader'
import './CheckScreen.css'

export interface LogEntry {
  id: number
  event: MidiNoteEvent
}

interface Props {
  log: LogEntry[]
  /** Текст последней ошибки запроса MIDI (для диагностики); null — ошибки нет. */
  accessError: string | null
  /** «Назад» — в «Настройки», откуда пришли. */
  onBack: () => void
  onHome: () => void
}

/**
 * «Проверка пианино» — вложенный экран «Настроек» (бывший MIDI-монитор этапа 0): какие ноты
 * приходят с активного устройства и что ответила система на запрос MIDI. Статус связи — в
 * верхней панели; устройства, глиссандо и переподключение — в «Настройках» (C-APP-1, OB-14).
 */
function CheckScreen({ log, accessError, onBack, onHome }: Props) {
  return (
    <main className="screen check">
      <ScreenHeader title="Проверка пианино" onBack={onBack} onHome={onHome} />

      {accessError && <p className="check__error">Ответ системы: {accessError}</p>}

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
                <span className="log__kind">{event.type === 'noteOn' ? 'нажата' : 'отпущена'}</span>
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
