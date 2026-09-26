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
import SequenceStaff from './sequences/SequenceStaff'
import SessionSummary from './sequences/SessionSummary'
import { useSequenceSession } from './sequences/useSequenceSession'
import AutoAdvanceIcon from './sequences/AutoAdvanceIcon'
import { Toggle } from './controls/Controls'
import { summarize } from '../engine/sequences/session'
import type { SequenceSettings } from '../engine/sequences/settings'
import { loadHintProgress, saveHintProgress } from '../storage/progress'
import * as modeMenu from '../engine/modes/modeMenu'
import { modeInfo, type ModeId } from '../engine/modes/modes'
import WaitingScreen, { type SlotButton } from './WaitingScreen'
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
  const [accessError, setAccessError] = useState<string | null>(null)
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

  // Упражнения на нотном стане: каждая сыгранная нота (пианино или касание) идёт в оба,
  // но меняет состояние только то, что сейчас идёт.
  const exercise = useExercise()
  const playedInExercise = exercise.played
  const sequences = useSequenceSession()
  const playedInSequences = sequences.played
  const exerciseRunning = exercise.running || sequences.running

  /** Остановить любое упражнение и закрыть итог сессии (Стоп, Режим, Проверка пианино). */
  function stopExercises() {
    exercise.stop()
    sequences.stop()
  }

  // Режимы: какой запускает «Старт» и что показывает меню режимов (C-MODE-1).
  const [activeMode, setActiveMode] = useState<ModeId>(() => settingsRef.current!.activeMode)
  const [menu, setMenu] = useState<modeMenu.MenuState>(modeMenu.MENU_CLOSED)
  const closeMenu = useCallback(() => setMenu(modeMenu.closeMenu()), [])
  // Подтверждённые настройки «Последовательностей» — в состоянии, потому что их флажок
  // виден и на главном экране.
  const [sequenceSettings, setSequenceSettings] = useState(
    () => settingsRef.current!.modeSettings.sequences,
  )
  function saveSequenceSettings(next: SequenceSettings) {
    setSequenceSettings(next)
    updateSettings({ modeSettings: { ...settingsRef.current!.modeSettings, sequences: next } })
  }

  /**
   * Запустить упражнение режима с его подтверждёнными настройками. Настройки передаются явно,
   * когда их только что подтвердили в меню и состояние ещё не обновилось.
   */
  function startMode(mode: ModeId, settings: SequenceSettings = sequenceSettings) {
    stopExercises()
    switch (mode) {
      case 'sequences':
        // Подсказки «якорь + интервал» — только для шагов из одной ноты (C-STF-3, OB-8).
        sequences.start(
          settings,
          settings.hints && settings.notesPerStep === 1 ? loadHintProgress() : null,
        )
        break
      case 'warmup':
        exercise.start()
        break
    }
  }

  /** Подтверждённые настройки режима — с них меню начинает черновик. */
  function confirmedSettings(mode: ModeId): modeMenu.ModeSettings {
    return mode === 'sequences' ? sequenceSettings : null
  }

  /** «Выбрать» или «Старт» в меню: режим и его настройки становятся активными и запоминаются. */
  function confirmMode(andStart: boolean) {
    const { menu: next, activeMode: chosen, settings } = modeMenu.confirm(menu)
    setMenu(next)
    if (!chosen) return
    setActiveMode(chosen)
    updateSettings({ activeMode: chosen })
    if (chosen === 'sequences' && settings) saveSequenceSettings(settings)
    if (andStart) startMode(chosen, settings ?? sequenceSettings)
  }

  /** Единая точка входа для нажатий с пианино и с экрана. */
  const handleKeyInput = useCallback(
    (input: KeyInput) => {
      const { state, playedNote } = reduce(keyboardRef.current, input)
      if (state !== keyboardRef.current) {
        keyboardRef.current = state
        setKeyboard(state)
      }
      if (playedNote) {
        playedInExercise(playedNote.pitch)
        playedInSequences(playedNote.pitch)
      }
    },
    [playedInExercise, playedInSequences],
  )

  function toggleGlissando() {
    const enabled = !keyboardRef.current.glissando
    updateSettings({ glissando: enabled })
    handleKeyInput({ kind: 'setGlissando', enabled })
  }

  /**
   * Перезапуск приложения. Chrome запускает MIDI один раз на страницу и запоминает неудачу:
   * повторный запрос доступа без перезагрузки получает тот же отказ. Перезагрузка — это
   * новый запуск MIDI, как будто кабель переподключили. Оболочка берётся из кеша, это быстро.
   */
  function restartApp() {
    window.location.reload()
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
        onAccessError: setAccessError,
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

  const session = sequences.state
  // Уровни подсказок меняются только при завершении последовательности — тогда и сохраняем.
  const sessionHints = session.phase === 'idle' ? null : session.hints
  useEffect(() => {
    if (sessionHints) saveHintProgress(sessionHints)
  }, [sessionHints])

  let slotButton: SlotButton | null = null
  if (session.phase === 'playing') {
    slotButton = { label: 'Пропустить', onClick: sequences.skip }
  } else if (session.phase === 'finished') {
    const label = sequences.countdown === null ? 'Далее' : `Далее (${sequences.countdown})`
    slotButton = { label, onClick: sequences.next }
  }

  let staff
  if (session.phase === 'summary') {
    staff = (
      <SessionSummary
        summary={summarize(session.sequences, session.history, session.hints !== null)}
        onRepeat={sequences.repeat}
        onNew={() => startMode('sequences')}
      />
    )
  } else if (sequences.running) {
    staff = <SequenceStaff session={session} />
  } else {
    staff = <StaffView exercise={exercise.state} />
  }

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
        accessError={accessError}
        onRestart={restartApp}
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
        onRestart={restartApp}
        onOpenCheck={() => {
          // Уход с главного экрана останавливает упражнение (C-STF-1, OB-20).
          stopExercises()
          setScreen('check')
        }}
        exerciseRunning={exerciseRunning}
        onToggleExercise={exerciseRunning ? stopExercises : () => startMode(activeMode)}
        activeModeTitle={modeInfo(activeMode).title}
        onOpenModes={() => {
          // Пока меню открыто, упражнение не идёт (C-MODE-1, OB-3).
          stopExercises()
          setMenu(modeMenu.openMenu())
        }}
        modeMenuOpen={menu.screen !== 'closed'}
        modeControl={
          activeMode === 'sequences' && (
            <Toggle
              compact
              label="Переключать автоматически"
              icon={<AutoAdvanceIcon />}
              checked={sequenceSettings.autoAdvance}
              onChange={(autoAdvance) => {
                saveSequenceSettings({ ...sequenceSettings, autoAdvance })
                sequences.setAutoAdvance(autoAdvance)
              }}
            />
          )
        }
        slotButton={slotButton}
        staff={staff}
        onApplyUpdate={applyUpdate}
        keyboard={<Keyboard state={keyboard} onInput={handleKeyInput} focus={sequences.focus} />}
      />
      <ModeMenu
        menu={menu}
        activeMode={activeMode}
        onChoose={(mode) => setMenu(modeMenu.chooseMode(menu, mode, confirmedSettings(mode)))}
        onEditDraft={(draft) => setMenu(modeMenu.editDraft(menu, draft))}
        onBack={() => setMenu(modeMenu.back(menu))}
        onClose={closeMenu}
        onSelect={() => confirmMode(false)}
        onStart={() => confirmMode(true)}
      />
    </>
  )
}

export default App
