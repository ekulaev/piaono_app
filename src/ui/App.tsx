import { useEffect, useRef, useState } from 'react'
import { startMidiMonitor } from '../midi/midiAccess'
import { pitchToNoteName } from '../midi/noteNames'
import type { ConnectionState, MidiDeviceInfo, MidiNoteEvent } from '../midi/types'
import './App.css'

const MAX_LOG_ENTRIES = 100

interface LogEntry {
  id: number
  event: MidiNoteEvent
}

const STATUS_TEXT: Record<ConnectionState, string> = {
  unavailable: 'Браузер не поддерживает MIDI. Открой эту страницу в Chrome.',
  connecting: 'Подключаемся…',
  'no-device': 'Пианино не подключено. Подключи его USB-кабелем к планшету.',
  connected: 'Пианино на связи',
}

function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const nextLogId = useRef(0)

  useEffect(() => {
    const stop = startMidiMonitor({
      onConnectionChange: (state, devices) => {
        setConnectionState(state)
        setDevices(devices)
      },
      onNoteEvent: (event) => {
        const id = nextLogId.current++
        setLog((prev) => [{ id, event }, ...prev].slice(0, MAX_LOG_ENTRIES))
      },
    })
    return stop
  }, [])

  return (
    <main className="monitor">
      <h1>MIDI-монитор</h1>

      <section className={`status status--${connectionState}`} aria-live="polite">
        <span className="status__dot" aria-hidden="true" />
        <span className="status__text">{STATUS_TEXT[connectionState]}</span>
      </section>

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

export default App
