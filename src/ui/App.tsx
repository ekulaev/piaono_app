import { useCallback, useEffect, useRef, useState } from 'react'
import { createKeyboardState, reduce } from '../engine/keyboard/keyboardState'
import type { KeyInput } from '../engine/keyboard/types'
import { startMidiMonitor } from '../midi/midiAccess'
import type { ConnectionState, MidiDeviceInfo, MidiMonitor } from '../midi/types'
import { loadSettings, saveSettings, type Settings } from '../storage/settings'
import CheckScreen, { type LogEntry } from './CheckScreen'
import Keyboard from './keyboard/Keyboard'
import StaffView from './staff/StaffView'
import { useExercise } from './staff/useExercise'
import ModeMenu from './modes/ModeMenu'
import * as modeMenu from '../engine/modes/modeMenu'
import { modeInfo, type ModeId } from '../engine/modes/modes'
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
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const nextLogId = useRef(0)
  const monitorRef = useRef<MidiMonitor | null>(null)
  const { updateReady, applyUpdate } = useAppUpdate()

  // Настройки читаются один раз при запуске; меняются и сохраняются целиком.
  const settingsRef = useRef<Settings | null>(null)
  settingsRef.current ??= loadSettings()
  function updateSettings(change: Partial<Settings>) {
    const next = { ...settingsRef.current!, ...change }
    settingsRef.current = next
    saveSettings(next)
  }

  const [keyboard, setKeyboard] = useState(() =>
    createKeyboardState(settingsRef.current!.glissando),
  )
  // Последнее состояние без ожидания рендера: события MIDI и касаний идут чаще кадров.
  const keyboardRef = useRef(keyboard)

  // Упражнение на нотном стане: каждая сыгранная нота (пианино или касание) идёт в него.
  const exercise = useExercise()
  const playedInExercise = exercise.played

  // Режимы: какой запускает «Старт» и что показывает меню режимов (C-MODE-1).
  const [activeMode, setActiveMode] = useState<ModeId>(() => settingsRef.current!.activeMode)
  const [menu, setMenu] = useState<modeMenu.MenuState>(modeMenu.MENU_CLOSED)
  const closeMenu = useCallback(() => setMenu(modeMenu.closeMenu()), [])

  /** Запустить упражнение режима. Этап 4 добавит сюда ветку «Последовательностей». */
  function startMode(mode: ModeId) {
    switch (mode) {
      case 'warmup':
        exercise.start()
        break
    }
  }

  /** «Выбрать» или «Старт» в меню: режим экрана становится активным и запоминается. */
  function confirmMode(andStart: boolean) {
    const { menu: next, activeMode: chosen } = modeMenu.confirm(menu)
    setMenu(next)
    if (!chosen) return
    setActiveMode(chosen)
    updateSettings({ activeMode: chosen })
    if (andStart) startMode(chosen)
  }

  /** Единая точка входа для нажатий с пианино и с экрана. */
  const handleKeyInput = useCallback(
    (input: KeyInput) => {
      const { state, playedNote } = reduce(keyboardRef.current, input)
      if (state !== keyboardRef.current) {
        keyboardRef.current = state
        setKeyboard(state)
      }
      if (playedNote) playedInExercise(playedNote.pitch)
    },
    [playedInExercise],
  )

  function toggleGlissando() {
    const enabled = !keyboardRef.current.glissando
    updateSettings({ glissando: enabled })
    handleKeyInput({ kind: 'setGlissando', enabled })
  }

  /** Ученик выбрал, с какого устройства играть: слушаем его и запоминаем выбор. */
  function selectDevice(device: MidiDeviceInfo) {
    updateSettings({ preferredInput: device })
    monitorRef.current?.selectInput(device)
  }

  useEffect(() => {
    const monitor = startMidiMonitor(
      {
        onConnectionChange: (state, devices, activeId) => {
          setConnectionState(state)
          setDevices(devices)
          setActiveDeviceId(activeId)
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
      },
      { preferred: settingsRef.current!.preferredInput },
    )
    monitorRef.current = monitor
    return monitor.stop
  }, [handleKeyInput])

  if (screen === 'check') {
    return (
      <CheckScreen
        connectionState={connectionState}
        devices={devices}
        activeDeviceId={activeDeviceId}
        onSelectDevice={selectDevice}
        log={log}
        glissando={keyboard.glissando}
        onToggleGlissando={toggleGlissando}
        onBack={() => setScreen('waiting')}
      />
    )
  }

  return (
    <>
      <WaitingScreen
        connectionState={connectionState}
        devices={devices}
        activeDeviceId={activeDeviceId}
        updateReady={updateReady}
        onRetry={() => monitorRef.current?.retry()}
        onOpenCheck={() => {
          // Уход с главного экрана останавливает упражнение (C-STF-1, OB-20).
          exercise.stop()
          setScreen('check')
        }}
        exerciseRunning={exercise.running}
        onToggleExercise={exercise.running ? exercise.stop : () => startMode(activeMode)}
        activeModeTitle={modeInfo(activeMode).title}
        onOpenModes={() => {
          // Пока меню открыто, упражнение не идёт (C-MODE-1, OB-3).
          exercise.stop()
          setMenu(modeMenu.openMenu())
        }}
        staff={<StaffView exercise={exercise.state} />}
        onApplyUpdate={applyUpdate}
        keyboard={<Keyboard state={keyboard} onInput={handleKeyInput} />}
      />
      <ModeMenu
        menu={menu}
        activeMode={activeMode}
        onChoose={(mode) => setMenu(modeMenu.chooseMode(menu, mode))}
        onBack={() => setMenu(modeMenu.back(menu))}
        onClose={closeMenu}
        onSelect={() => confirmMode(false)}
        onStart={() => confirmMode(true)}
      />
    </>
  )
}

export default App
