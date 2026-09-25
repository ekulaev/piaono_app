import { useEffect, useRef, useState } from 'react'
import { startMidiMonitor } from '../midi/midiAccess'
import { pitchToNoteName } from '../midi/noteNames'
import type { ConnectionState, MidiDeviceInfo } from '../midi/types'
import CheckScreen, { type LogEntry } from './CheckScreen'
import WaitingScreen from './WaitingScreen'
import { useAppUpdate } from './useAppUpdate'

const MAX_LOG_ENTRIES = 100

type Screen = 'waiting' | 'check'

/**
 * Корень приложения. Владеет единственной подпиской на MIDI: экраны получают состояние
 * через props, поэтому переход между ними не трогает соединение и не теряет журнал нот.
 */
function App() {
  const [screen, setScreen] = useState<Screen>('waiting')
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [lastNoteName, setLastNoteName] = useState<string | null>(null)
  const nextLogId = useRef(0)
  const retryRef = useRef<() => void>(() => {})
  const { updateReady, applyUpdate } = useAppUpdate()

  useEffect(() => {
    const monitor = startMidiMonitor({
      onConnectionChange: (state, devices) => {
        setConnectionState(state)
        setDevices(devices)
      },
      onNoteEvent: (event) => {
        if (event.type === 'noteOn') setLastNoteName(pitchToNoteName(event.pitch))
        const id = nextLogId.current++
        setLog((prev) => [{ id, event }, ...prev].slice(0, MAX_LOG_ENTRIES))
      },
    })
    retryRef.current = monitor.retry
    return monitor.stop
  }, [])

  if (screen === 'check') {
    return (
      <CheckScreen
        connectionState={connectionState}
        devices={devices}
        log={log}
        onBack={() => setScreen('waiting')}
      />
    )
  }

  return (
    <WaitingScreen
      connectionState={connectionState}
      devices={devices}
      lastNoteName={lastNoteName}
      updateReady={updateReady}
      onRetry={() => retryRef.current()}
      onOpenCheck={() => setScreen('check')}
      onApplyUpdate={applyUpdate}
    />
  )
}

export default App
