import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { createKeyboardState, reduce } from '../engine/keyboard/keyboardState'
import type { KeyInput } from '../engine/keyboard/types'
import { startMidiMonitor } from '../midi/midiAccess'
import type { ConnectionState, MidiDeviceInfo, MidiMonitor } from '../midi/types'
import { loadSettings, saveSettings, type Settings } from '../storage/settings'
import CheckScreen, { type LogEntry } from './CheckScreen'
import TopBar from './topbar/TopBar'
import SettingsScreen from './settings/SettingsScreen'
import ProgressScreen from './progress/ProgressScreen'
import './App.css'
import Keyboard from './keyboard/Keyboard'
import { useKeyboardFocus } from './keyboard/useKeyboardFocus'
import WarmupPreview from './warmup/WarmupPreview'
import { naturalPitch } from '../engine/warmup/steps'
import type { Clef } from '../engine/staff/pickNote'
import StaffView from './staff/StaffView'
import { useExercise } from './staff/useExercise'
import ModeMenu from './modes/ModeMenu'
import SequenceStaff from './sequences/SequenceStaff'
import SessionSummary from './sequences/SessionSummary'
import { useSequenceSession } from './sequences/useSequenceSession'
import AutoAdvanceIcon from './sequences/AutoAdvanceIcon'
import { KeyLabelsIcon } from './icons/Icons'
import RhythmStaff from './rhythm/RhythmStaff'
import RhythmSummary from './rhythm/RhythmSummary'
import { useRhythmSession } from './rhythm/useRhythmSession'
import { summarizeRhythm } from '../engine/rhythm/session'
import type { RhythmSettings } from '../engine/rhythm/settings'
import type { WarmupSettings } from '../engine/warmup/settings'
import { Toggle } from './controls/Controls'
import { summarize } from '../engine/sequences/session'
import type { SequenceSettings } from '../engine/sequences/settings'
import {
  loadProgress,
  resetHintProgress,
  resetModeStats,
  saveHintProgress,
  saveModeStats,
} from '../storage/progress'
import { warmupEvent } from '../engine/stats/events'
import { improvements } from '../engine/stats/improvements'
import { aggregate, applyEvents, hasProgress, type ModeStats } from '../engine/stats/stats'
import { weightsFor } from '../engine/stats/weights'
import { summarizeWarmup } from '../engine/staff/exercise'
import NoProgress from './stats/NoProgress'
import WarmupSummary from './stats/WarmupSummary'
import * as modeMenu from '../engine/modes/modeMenu'
import type { ModeId } from '../engine/modes/modes'
import WaitingScreen, { type SlotButton } from './WaitingScreen'
import HintButton from './hints/HintButton'
import { modeHintId } from './hints/hints'
import { useAppUpdate } from './useAppUpdate'
import NoteEchoStrip from './echo/NoteEchoStrip'
import { useNoteEcho } from './echo/useNoteEcho'
import I18nProvider from './i18n/I18nProvider'
import { useI18n } from './i18n/useI18n'
import { AVAILABLE_LANGUAGES, resolveLanguage } from '../i18n'
import { useSolfegeSession } from './solfege/useSolfegeSession'
import SolfegeStaff from './solfege/SolfegeStaff'
import SolfegeSummary from './solfege/SolfegeSummary'
import SolfegeInvite from './solfege/SolfegeInvite'
import { intervalFocus, intervalKeyMarks } from './solfege/intervalsView'
import {
  buildIntervalTasks,
  INTERVALS_RANGE,
  type IntervalTask,
} from '../engine/solfege/intervals/generate'
import { INTERVAL_KEYMAP } from '../engine/solfege/intervals/keymap'
import type { IntervalsSettings } from '../engine/solfege/intervals/settings'
import { summarize as summarizeSolfege } from '../engine/solfege/session'
import type { Task } from '../engine/solfege/types'
import { taskWeights } from '../engine/stats/weights'

const MAX_LOG_ENTRIES = 100

/** Экраны под верхней панелью (C-APP-1): главный, «Настройки» и вложенная «Проверка пианино». */
type Screen = 'main' | 'settings' | 'check' | 'progress'

interface MainProps {
  settingsRef: MutableRefObject<Settings | null>
  updateSettings: (change: Partial<Settings>) => void
}

/**
 * Основное содержимое приложения. Владеет единственной подпиской на MIDI и состоянием клавиатуры:
 * экраны получают их через props, поэтому переход между ними не трогает соединение
 * и не теряет журнал нот. Ноты приходят из двух источников — пианино и касания
 * экранной клавиатуры — и дальше неотличимы.
 */
function Main({ settingsRef, updateSettings }: MainProps) {
  const { t } = useI18n()
  const [screen, setScreen] = useState<Screen>('main')
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [accessError, setAccessError] = useState<string | null>(null)
  // Время показа нажатой ноты (C-STF-8): общее для всех режимов, меняется в «Настройках».
  const [noteEchoEnabled, setNoteEchoEnabled] = useState(() => settingsRef.current!.noteEchoEnabled)
  const [keyLabels, setKeyLabels] = useState(() => settingsRef.current!.keyLabels)
  const [noteEchoMs, setNoteEchoMs] = useState(() => settingsRef.current!.noteEchoMs)
  const nextLogId = useRef(0)
  const monitorRef = useRef<MidiMonitor | null>(null)
  const { updateReady, applyUpdate } = useAppUpdate()

  const [keyboard, setKeyboard] = useState(() =>
    createKeyboardState(settingsRef.current!.glissando),
  )
  // Последнее состояние без ожидания рендера: события MIDI и касаний идут чаще кадров.
  const keyboardRef = useRef(keyboard)

  // Упражнения на нотном стане: каждая сыгранная нота (пианино или касание) идёт в оба,
  // но меняет состояние только то, что сейчас идёт.
  const exercise = useExercise()
  const playedInExercise = exercise.played
  // Запросы «показать участок клавиатуры»: «Последовательности» и авто-сдвиг «Разминки».
  const keyboardFocus = useKeyboardFocus()
  const requestKeyboardFocus = keyboardFocus.request
  const sequences = useSequenceSession(requestKeyboardFocus)
  // Сколько белых клавиш видно: нужно настройкам «Разминки»; null — клавиатуры нет.
  const [keyboardCapacity, setKeyboardCapacity] = useState<number | null>(null)
  const keyboardCapacityRef = useRef(keyboardCapacity)
  keyboardCapacityRef.current = keyboardCapacity
  const playedInSequences = sequences.played
  // «Ритму» нужна не высота, а момент нажатия (C-STF-6).
  const rhythm = useRhythmSession()
  const playedInRhythm = rhythm.played
  // Сольфеджио (C-SOL-1): на каждом новом задании клавиатура показывает его участок.
  const showSolfegeTask = useCallback(
    (task: Task) => {
      const focus = intervalFocus(task as IntervalTask)
      requestKeyboardFocus(focus.low, focus.high, focus.align)
    },
    [requestKeyboardFocus],
  )
  const solfege = useSolfegeSession(showSolfegeTask)
  const playedInSolfege = solfege.press
  const echo = useNoteEcho(noteEchoMs)
  // Свежее значение для обработчика нажатий, который не пересоздаётся при смене настройки.
  const noteEchoEnabledRef = useRef(noteEchoEnabled)
  useEffect(() => {
    noteEchoEnabledRef.current = noteEchoEnabled
  }, [noteEchoEnabled])
  const pushEcho = echo.push
  const clearEcho = echo.clear
  const exerciseRunning = exercise.running || sequences.running || rhythm.running || solfege.running

  /** Остановить любое упражнение и закрыть итог без нового итога (Режим, Проверка пианино). */
  function stopExercises() {
    exercise.stop()
    sequences.stop()
    rhythm.stop()
    solfege.stop()
  }

  /** «Стоп»: «Разминка» показывает итог (C-STF-4, OB-12), остальные режимы — нет. */
  function finishExercises() {
    exercise.finish()
    sequences.stop()
    rhythm.stop()
    // Сольфеджио: «Стоп» без итога, итог — после последнего задания (C-SOL-1, OB-17).
    solfege.stop()
  }

  // Статистика режимов (C-STF-4): что уже записано — для приглашения «Ещё нет прогресса».
  const [practice, setPractice] = useState(() => loadProgress().stats)
  // Уровни подсказок для экрана «Прогресс»: читаются при его открытии.
  const [hints, setHints] = useState(() => loadProgress().hints)
  // История «Разминки» до текущей сессии: к ней добавляются итоги нот, с ней сравнивается итог.
  const warmupBefore = useRef<ModeStats>(practice.warmup)

  // Режимы: какой запускает «Старт» и что показывает меню режимов (C-MODE-1).
  const [activeMode, setActiveMode] = useState<ModeId>(() => settingsRef.current!.activeMode)
  const [menu, setMenu] = useState<modeMenu.MenuState>(modeMenu.MENU_CLOSED)
  const closeMenu = useCallback(() => setMenu(modeMenu.closeMenu()), [])
  // Подтверждённые настройки режимов — в состоянии, потому что флажок «Переключать
  // автоматически» «Последовательностей» и «Контура» виден и на главном экране.
  const [modeSettings, setModeSettings] = useState(() => settingsRef.current!.modeSettings)
  type AllModeSettings = Settings['modeSettings']
  function saveModeSettings<M extends keyof AllModeSettings>(mode: M, next: AllModeSettings[M]) {
    const all = { ...settingsRef.current!.modeSettings, [mode]: next }
    setModeSettings(all)
    updateSettings({ modeSettings: all })
  }

  /**
   * Запустить упражнение режима с его подтверждёнными настройками. Настройки передаются явно,
   * когда их только что подтвердили в меню и состояние ещё не обновилось.
   */
  function startMode(mode: ModeId, confirmed?: modeMenu.ModeSettings) {
    stopExercises()
    switch (mode) {
      case 'rhythm': {
        // «Ритм»: рисунки из фигур уровня, своя статистика фигур (C-STF-6).
        const settings = (confirmed as RhythmSettings | undefined) ?? modeSettings.rhythm
        rhythm.start(settings, loadProgress().stats.rhythm)
        break
      }
      case 'contour': {
        // «Контур»: только направление, без подсказок, своя статистика (C-STF-5).
        const settings = (confirmed as SequenceSettings | undefined) ?? modeSettings.contour
        sequences.start(settings, null, loadProgress().stats.contour, 'contour')
        break
      }
      case 'sequences': {
        const settings = (confirmed as SequenceSettings | undefined) ?? modeSettings.sequences
        const progress = loadProgress()
        // Подсказки «якорь + интервал» — только для шагов из одной ноты (C-STF-3, OB-8).
        sequences.start(
          settings,
          settings.hints && settings.notesPerStep === 1 ? progress.hints : null,
          progress.stats.sequences,
        )
        break
      }
      case 'intervals': {
        // «Интервалы»: задания по трудности типов, своя статистика заданий (C-SOL-2).
        const settings = (confirmed as IntervalsSettings | undefined) ?? modeSettings.intervals
        const stats = loadProgress().stats.intervals
        solfege.start(
          buildIntervalTasks(settings.tasks, settings.variant, taskWeights(stats), Math.random),
          settings.autoAdvance,
          stats,
        )
        break
      }
      case 'warmup':
        warmupBefore.current = loadProgress().stats.warmup
        exercise.start(
          weightsFor(warmupBefore.current),
          (confirmed as WarmupSettings | undefined) ?? modeSettings.warmup,
        )
        break
    }
  }

  // Короткие названия интервалов над клавишами на языке приложения (C-SOL-2, OB-7).
  const intervalLegend = Object.fromEntries(
    Object.entries(INTERVAL_KEYMAP).map(([pc, id]) => [pc, t(`interval.short.${id}`)]),
  )

  /** Подтверждённые настройки режима — с них меню начинает черновик. */
  function confirmedSettings(mode: ModeId): modeMenu.ModeSettings {
    return modeSettings[mode]
  }

  /** «Выбрать» или «Старт» в меню: режим и его настройки становятся активными и запоминаются. */
  function confirmMode(andStart: boolean) {
    const { menu: next, activeMode: chosen, settings } = modeMenu.confirm(menu)
    setMenu(next)
    if (!chosen) return
    setActiveMode(chosen)
    updateSettings({ activeMode: chosen })
    if (chosen === 'rhythm' && settings) saveModeSettings(chosen, settings as RhythmSettings)
    else if (chosen === 'warmup' && settings) saveModeSettings(chosen, settings as WarmupSettings)
    else if (chosen === 'intervals' && settings) {
      saveModeSettings(chosen, settings as IntervalsSettings)
    } else if (settings) saveModeSettings(chosen, settings as SequenceSettings)
    if (andStart) startMode(chosen, settings ?? undefined)
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
        playedInRhythm(playedNote.time)
        playedInSolfege(playedNote.pitch)
        if (noteEchoEnabledRef.current) pushEcho(playedNote.pitch)
      }
    },
    [playedInExercise, playedInSequences, playedInRhythm, playedInSolfege, pushEcho],
  )

  // Карточки живут только на главном экране: при возврате полоса пуста (C-STF-8, OB-16).
  useEffect(() => {
    if (screen !== 'main') clearEcho()
  }, [screen, clearEcho])

  function changeNoteEchoEnabled(enabled: boolean) {
    setNoteEchoEnabled(enabled)
    updateSettings({ noteEchoEnabled: enabled })
    // Выключили — висящие карточки и их таймеры уходят сразу.
    if (!enabled) clearEcho()
  }

  function changeNoteEchoMs(ms: number) {
    setNoteEchoMs(ms)
    updateSettings({ noteEchoMs: ms })
  }

  function changeKeyLabels(enabled: boolean) {
    setKeyLabels(enabled)
    updateSettings({ keyLabels: enabled })
  }

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

  /**
   * «Настройки» — кнопкой или статусом связи в панели. Упражнение останавливается без итога,
   * как раньше при уходе в «Проверку пианино» (C-APP-1, OB-4).
   */
  function openSettings() {
    stopExercises()
    closeMenu()
    setScreen('settings')
  }

  /** «Прогресс» — так же, как «Настройки»: упражнение останавливается без итога (C-STF-7, OB-2). */
  function openProgress() {
    stopExercises()
    closeMenu()
    setHints(loadProgress().hints)
    setScreen('progress')
  }

  /** Подтверждённый сброс (C-STF-7): стирается только выбранное, экраны сразу видят новое. */
  function resetStats(mode: ModeId) {
    resetModeStats(mode)
    setPractice(loadProgress().stats)
    if (mode === 'warmup') warmupBefore.current = loadProgress().stats.warmup
  }
  function resetHints() {
    resetHintProgress()
    setHints(loadProgress().hints)
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
            handleKeyInput({
              kind: 'pianoDown',
              pitch: event.pitch,
              velocity: event.velocity,
              time: event.time,
            })
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
    // Выбранное устройство читаем в момент запуска MIDI; его смена не должна перезапускать связь.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [handleKeyInput])

  const session = sequences.state
  // Уровни подсказок меняются только при завершении последовательности — тогда и сохраняем.
  const sessionHints = session.phase === 'idle' ? null : session.hints
  useEffect(() => {
    if (sessionHints) saveHintProgress(sessionHints)
  }, [sessionHints])

  // Статистика пишется, когда добавились события: завершилась последовательность или нота.
  // «Последовательности» и «Контур» идут одним автоматом; статистика — в режим сессии.
  const sequenceStats = session.phase === 'idle' ? null : session.stats
  const statsMode =
    session.phase !== 'idle' && session.check === 'contour' ? 'contour' : 'sequences'
  useEffect(() => {
    if (!sequenceStats || sequenceStats.events.length === 0) return
    const stats = applyEvents(sequenceStats.before, sequenceStats.events)
    saveModeStats(statsMode, stats)
    setPractice((prev) => ({ ...prev, [statsMode]: stats }))
  }, [sequenceStats, statsMode])

  // «Ритм»: события добавляются при оценке каждой попытки (C-STF-6, OB-11).
  const rhythmState = rhythm.state
  const rhythmStats =
    rhythmState.phase === 'idle' || rhythmState.phase === 'summary' ? null : rhythmState.stats
  useEffect(() => {
    if (!rhythmStats || rhythmStats.events.length === 0) return
    const stats = applyEvents(rhythmStats.before, rhythmStats.events)
    saveModeStats('rhythm', stats)
    setPractice((prev) => ({ ...prev, rhythm: stats }))
  }, [rhythmStats])

  // Сольфеджио: событие добавляется, когда задание завершено (C-SOL-1, OB-16).
  const solfegeState = solfege.state
  const solfegeStats = solfegeState.phase === 'idle' ? null : solfegeState.stats
  useEffect(() => {
    if (!solfegeStats || solfegeStats.events.length === 0) return
    const stats = applyEvents(solfegeStats.before, solfegeStats.events)
    saveModeStats('intervals', stats)
    setPractice((prev) => ({ ...prev, intervals: stats }))
  }, [solfegeStats])

  const warmupResults = exercise.state.phase === 'idle' ? null : exercise.state.results
  useEffect(() => {
    if (!warmupResults || warmupResults.length === 0) return
    const stats = applyEvents(warmupBefore.current, warmupResults.map(warmupEvent))
    saveModeStats('warmup', stats)
    setPractice((prev) => ({ ...prev, warmup: stats }))
  }, [warmupResults])

  let slotButton: SlotButton | null = null
  // «Ритм»: одна кнопка по ходу рисунка (C-STF-6, OB-9).
  if (rhythmState.phase === 'ready') {
    slotButton = { label: t('slot.skip'), onClick: rhythm.skip }
  } else if (rhythmState.phase === 'tapping') {
    slotButton = { label: t('slot.restart'), onClick: rhythm.restart }
  } else if (rhythmState.phase === 'evaluated') {
    slotButton = { label: t('slot.next'), onClick: rhythm.next }
  } else if (solfegeState.phase === 'asking') {
    slotButton = { label: t('slot.skip'), onClick: solfege.skip }
  } else if (solfegeState.phase === 'done') {
    const label =
      solfege.countdown === null
        ? t('slot.next')
        : t('slot.nextCountdown', { n: solfege.countdown })
    slotButton = { label, onClick: solfege.next }
  } else if (session.phase === 'playing') {
    slotButton = { label: t('slot.skip'), onClick: sequences.skip }
  } else if (session.phase === 'finished') {
    const label =
      sequences.countdown === null
        ? t('slot.next')
        : t('slot.nextCountdown', { n: sequences.countdown })
    slotButton = { label, onClick: sequences.next }
  }

  // Авто-сдвиг клавиатуры (C-STF-9, OB-22…OB-25): нижняя нота диапазона — крайняя слева на
  // «Старт» и при появлении ноты другого ключа; первая нота сессии — тоже смена.
  const warmupSession = exercise.state.phase === 'moving' ? exercise.state : null
  const lastShiftClef = useRef<Clef | null>(null)
  useEffect(() => {
    if (!exercise.running) lastShiftClef.current = null
  }, [exercise.running])
  useEffect(() => {
    if (!warmupSession) return
    const { note, settings } = warmupSession
    if (!settings.autoShift || keyboardCapacityRef.current === null) return
    if (note.clef === lastShiftClef.current) return
    lastShiftClef.current = note.clef
    const range = note.clef === 'treble' ? settings.trebleRange : settings.bassRange
    requestKeyboardFocus(naturalPitch(range.low), naturalPitch(range.high), 'left')
    // Только новая нота: остальное состояние упражнения сдвиг не вызывает.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [warmupSession?.note, requestKeyboardFocus])

  let staff
  if (menu.screen === 'mode' && menu.modeId === 'warmup' && menu.draft) {
    // Пока открыты настройки «Разминки», в зоне стана — предпросмотр диапазона (C-STF-9, OB-9).
    staff = <WarmupPreview settings={menu.draft as WarmupSettings} />
  } else if (session.phase === 'summary') {
    const stats = session.stats
    staff = (
      <SessionSummary
        summary={summarize(
          session.sequences,
          session.history,
          session.hints !== null,
          session.check,
        )}
        contour={session.check === 'contour'}
        improvements={
          stats ? improvements(stats.before, aggregate(stats.events)) : { firstSession: true }
        }
        onRepeat={sequences.repeat}
        onNew={() => startMode(session.check === 'contour' ? 'contour' : 'sequences')}
      />
    )
  } else if (rhythmState.phase === 'summary') {
    const stats = rhythmState.stats
    staff = (
      <RhythmSummary
        summary={summarizeRhythm(rhythmState.patterns, rhythmState.history)}
        improvements={
          stats ? improvements(stats.before, aggregate(stats.events)) : { firstSession: true }
        }
        onRepeat={rhythm.repeat}
        onNew={() => startMode('rhythm')}
      />
    )
  } else if (solfegeState.phase === 'summary') {
    const stats = solfegeState.stats
    staff = (
      <SolfegeSummary
        summary={summarizeSolfege(solfegeState.tasks, solfegeState.history)}
        improvements={improvements(stats.before, aggregate(stats.events))}
        onRepeat={solfege.repeat}
        onNew={() => startMode('intervals')}
      />
    )
  } else if (solfegeState.phase === 'asking' || solfegeState.phase === 'done') {
    staff = <SolfegeStaff session={solfegeState} />
  } else if (activeMode === 'intervals' && !hasProgress(practice.intervals)) {
    staff = <SolfegeInvite />
  } else if (rhythm.running) {
    staff = <RhythmStaff session={rhythmState} />
  } else if (sequences.running) {
    staff = <SequenceStaff session={session} />
  } else if (exercise.state.phase === 'summary') {
    const results = exercise.state.results
    staff = (
      <WarmupSummary
        summary={summarizeWarmup(results)}
        improvements={improvements(warmupBefore.current, aggregate(results.map(warmupEvent)))}
        tonality={modeSettings.warmup.tonality}
      />
    )
  } else if (!exercise.running && !hasProgress(practice[activeMode])) {
    staff = <NoProgress />
  } else {
    staff = <StaffView exercise={exercise.state} />
  }

  // Задание сольфеджио на экране и легенда «клавиша → интервал» для «Узнай интервал».
  const solfegeActive =
    solfegeState.phase === 'asking' || solfegeState.phase === 'done' ? solfegeState : null
  const legendLabels =
    solfegeActive && solfegeActive.tasks[solfegeActive.index].answer.kind === 'value'
      ? intervalLegend
      : null

  let content
  if (screen === 'settings') {
    content = (
      <SettingsScreen
        connectionState={connectionState}
        devices={devices}
        activeDeviceId={activeDeviceId}
        onSelectDevice={selectDevice}
        onReconnect={restartApp}
        onOpenCheck={() => setScreen('check')}
        glissando={keyboard.glissando}
        onToggleGlissando={toggleGlissando}
        noteEchoEnabled={noteEchoEnabled}
        onChangeNoteEchoEnabled={changeNoteEchoEnabled}
        noteEchoMs={noteEchoMs}
        onChangeNoteEchoMs={changeNoteEchoMs}
        updateReady={updateReady}
        onApplyUpdate={applyUpdate}
        onBack={() => setScreen('main')}
      />
    )
  } else if (screen === 'progress') {
    content = (
      <ProgressScreen
        activeMode={activeMode}
        practice={practice}
        hints={hints}
        warmupTonality={modeSettings.warmup.tonality}
        onResetStats={resetStats}
        onResetHints={resetHints}
        onBack={() => setScreen('main')}
      />
    )
  } else if (screen === 'check') {
    content = (
      <CheckScreen
        log={log}
        accessError={accessError}
        onBack={() => setScreen('settings')}
        onHome={() => setScreen('main')}
      />
    )
  } else {
    content = (
      <WaitingScreen
        exerciseRunning={exerciseRunning}
        onToggleExercise={exerciseRunning ? finishExercises : () => startMode(activeMode)}
        activeModeTitle={t(`mode.${activeMode}`)}
        onOpenModes={() => {
          // Пока меню открыто, упражнение не идёт (C-MODE-1, OB-3).
          stopExercises()
          setMenu(modeMenu.openMenu())
        }}
        modeMenuOpen={menu.screen !== 'closed'}
        modeHint={
          // Как играть — без захода в меню. Окно не открывается поверх упражнения: сначала
          // упражнение останавливается без итога, как при переходе в «Настройки» (C-APP-2, OB-6).
          <HintButton id={modeHintId(activeMode)} placement="inline" beforeOpen={stopExercises} />
        }
        modeControl={
          // Флажок меняет настройку активного режима (C-STF-5: и в «Контуре»). У «Разминки» и
          // «Ритма» его нет: «Ритм» сам не переходит к следующему рисунку (C-STF-6, OB-2).
          activeMode === 'sequences' || activeMode === 'contour' ? (
            <Toggle
              compact
              label={t('modeControl.autoAdvance')}
              icon={<AutoAdvanceIcon />}
              checked={modeSettings[activeMode].autoAdvance}
              onChange={(autoAdvance) => {
                saveModeSettings(activeMode, { ...modeSettings[activeMode], autoAdvance })
                sequences.setAutoAdvance(autoAdvance)
              }}
            />
          ) : (
            // «Интервалы»: тот же флажок, та же механика (C-SOL-1, OB-10).
            activeMode === 'intervals' && (
              <Toggle
                compact
                label={t('modeControl.autoAdvance')}
                icon={<AutoAdvanceIcon />}
                checked={modeSettings.intervals.autoAdvance}
                onChange={(autoAdvance) => {
                  saveModeSettings('intervals', { ...modeSettings.intervals, autoAdvance })
                  solfege.setAutoAdvance(autoAdvance)
                }}
              />
            )
          )
        }
        labelsControl={
          // Одно значение на все режимы (C-KBD-3); переключение не останавливает упражнение.
          <Toggle
            compact
            label={t('keyLabels.toggle')}
            icon={<KeyLabelsIcon />}
            checked={keyLabels}
            onChange={changeKeyLabels}
          />
        }
        slotButton={slotButton}
        staff={staff}
        noteEcho={noteEchoEnabled ? <NoteEchoStrip slots={echo.slots} /> : null}
        keyboard={
          <Keyboard
            state={keyboard}
            onInput={handleKeyInput}
            focus={keyboardFocus.focus}
            onCapacity={setKeyboardCapacity}
            labels={keyLabels}
            // Сольфеджио: прокрутка в пределах диапазона режима, пока идёт задание (C-SOL-2,
            // OB-10); полоса легенды держит место, пока режим активен, кроме итога: так стан не
            // прыгает между заданиями, а итогу хватает высоты (OB-14).
            bounds={solfegeActive ? INTERVALS_RANGE : null}
            marks={solfegeActive ? intervalKeyMarks(solfegeActive) : null}
            legend={
              activeMode === 'intervals' && solfegeState.phase !== 'summary'
                ? { labels: legendLabels }
                : null
            }
          />
        }
      />
    )
  }

  return (
    <div className="app">
      {/* Одна панель на все экраны: при переходах не пересоздаётся (C-APP-1, OB-1). */}
      <TopBar
        connectionState={connectionState}
        onOpenSettings={openSettings}
        onOpenProgress={openProgress}
        current={screen === 'settings' || screen === 'progress' ? screen : null}
        updateReady={updateReady}
        onApplyUpdate={applyUpdate}
      />
      {content}
      <ModeMenu
        menu={menu}
        activeMode={activeMode}
        onChoose={(mode) => setMenu(modeMenu.chooseMode(menu, mode, confirmedSettings(mode)))}
        onEditDraft={(draft) => setMenu(modeMenu.editDraft(menu, draft))}
        onBack={() => setMenu(modeMenu.back(menu))}
        onClose={closeMenu}
        onSelect={() => confirmMode(false)}
        onStart={() => confirmMode(true)}
        keyboardCapacity={keyboardCapacity}
      />
    </div>
  )
}

/**
 * Корень приложения: настройки читаются один раз при запуске, меняются и сохраняются целиком;
 * язык (C-APP-3) — из них или из языка системы и передаётся всему дереву.
 */
function App() {
  const settingsRef = useRef<Settings | null>(null)
  settingsRef.current ??= loadSettings()
  const updateSettings = useCallback((change: Partial<Settings>) => {
    const next = { ...settingsRef.current!, ...change }
    settingsRef.current = next
    saveSettings(next)
  }, [])

  const [language, setLanguage] = useState(() =>
    resolveLanguage(settingsRef.current!.language, navigator.languages, AVAILABLE_LANGUAGES),
  )
  const selectLanguage = useCallback(
    (code: string) => {
      setLanguage(code)
      updateSettings({ language: code })
    },
    [updateSettings],
  )

  return (
    <I18nProvider language={language} onSelectLanguage={selectLanguage}>
      <Main settingsRef={settingsRef} updateSettings={updateSettings} />
    </I18nProvider>
  )
}

export default App
