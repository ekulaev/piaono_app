import { useCallback, useEffect, useRef, useState } from 'react'
import { createKeyboardState, reduce } from '../engine/keyboard/keyboardState'
import type { KeyInput } from '../engine/keyboard/types'
import { startMidiMonitor } from '../midi/midiAccess'
import { pitchToNoteName } from '../midi/noteNames'
import type { ConnectionState, MidiDeviceInfo } from '../midi/types'
import { loadSettings, saveSettings } from '../storage/settings'
import CheckScreen, { type LogEntry } from './CheckScreen'
import Keyboard from './keyboard/Keyboard'
import WaitingScreen from './WaitingScreen'
import { useAppUpdate } from './useAppUpdate'

const MAX_LOG_ENTRIES = 100

type Screen = 'waiting' | 'check'

/**
 * Корень приложения. Владеет единственной подпиской на MIDI и состоянием клавиатуры:
 * экраны получают их через props, поэтому переход между ними не трогает соединение
 * и не теряет журнал нот. Ноты приходят из двух источников — пианино и касания
 * экранной клавиатуры — и дальше неотличимы.
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

  const [keyboard, setKeyboard] = useState(() => createKeyboardState(loadSettings().glissando))
  // Последнее состояние без ожидания рендера: события MIDI и касаний идут чаще кадров.
  const keyboardRef = useRef(keyboard)

  /** Единая точка входа для нажатий с пианино и с экрана. */
  const handleKeyInput = useCallback((input: KeyInput) => {
    const { state, playedNote } = reduce(keyboardRef.current, input)
    if (state !== keyboardRef.current) {
      keyboardRef.current = state
      setKeyboard(state)
    }
    if (playedNote) setLastNoteName(pitchToNoteName(playedNote.pitch))
  }, [])

  function toggleGlissando() {
    const enabled = !keyboardRef.current.glissando
    saveSettings({ glissando: enabled })
    handleKeyInput({ kind: 'setGlissando', enabled })
  }

  useEffect(() => {
    const monitor = startMidiMonitor({
      onConnectionChange: (state, devices) => {
        setConnectionState(state)
        setDevices(devices)
        // Связи нет — клавиши, зажатые на пианино, уже не отпустятся: не оставляем их нажатыми.
        if (state !== 'connected') handleKeyInput({ kind: 'pianoReset' })
      },
      onNoteEvent: (event) => {
        if (event.type === 'noteOn') {
          handleKeyInput({ kind: 'pianoDown', pitch: event.pitch, velocity: event.velocity })
        } else {
          handleKeyInput({ kind: 'pianoUp', pitch: event.pitch })
        }
        // Журнал «Проверки пианино» — только про железо, касаний в нём нет.
        const id = nextLogId.current++
        setLog((prev) => [{ id, event }, ...prev].slice(0, MAX_LOG_ENTRIES))
      },
    })
    retryRef.current = monitor.retry
    return monitor.stop
  }, [handleKeyInput])

  if (screen === 'check') {
    return (
      <CheckScreen
        connectionState={connectionState}
        devices={devices}
        log={log}
        glissando={keyboard.glissando}
        onToggleGlissando={toggleGlissando}
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
      keyboard={<Keyboard state={keyboard} onInput={handleKeyInput} />}
    />
  )
}

export default App
