import { useCallback, useEffect, useRef, useState } from 'react'
import * as session from '../../engine/solfege/session'
import type { SolfegeState } from '../../engine/solfege/session'
import type { Task } from '../../engine/solfege/types'
import type { ModeStats } from '../../engine/stats/stats'

/**
 * Сессия сольфеджио в React (C-SOL-1): состояние автомата из engine/solfege и цикл кадров,
 * который работает только пока идёт отсчёт автоперехода. На каждом новом задании —
 * запрос показать его участок клавиатуры (авто-сдвиг, OB-13).
 */
export function useSolfegeSession(onNewTask: (task: Task) => void) {
  const [state, setState] = useState<SolfegeState>(session.IDLE)
  const stateRef = useRef(state)
  const [now, setNow] = useState(() => performance.now())

  const update = useCallback(
    (next: SolfegeState) => {
      const previous = stateRef.current
      if (next === previous) return
      stateRef.current = next
      setState(next)
      setNow(performance.now())
      const newTask =
        next.phase === 'asking' &&
        (previous.phase !== 'asking' ||
          previous.index !== next.index ||
          previous.tasks !== next.tasks)
      if (newTask) onNewTask(next.tasks[next.index])
    },
    [onNewTask],
  )

  const needsFrames = state.phase === 'done' && state.countdownUntil !== null
  useEffect(() => {
    if (!needsFrames) return
    let frame = 0
    const loop = () => {
      const t = performance.now()
      update(session.tick(stateRef.current, t))
      setNow(t) // для цифры на «Далее (N)»
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [needsFrames, update])

  const start = useCallback(
    (tasks: readonly Task[], autoAdvance: boolean, stats: ModeStats) =>
      update(session.startSession(tasks, autoAdvance, stats, performance.now())),
    [update],
  )
  const press = useCallback(
    (pitch: number) => update(session.press(stateRef.current, pitch, performance.now())),
    [update],
  )
  const skip = useCallback(
    () => update(session.skip(stateRef.current, performance.now())),
    [update],
  )
  const next = useCallback(
    () => update(session.next(stateRef.current, performance.now())),
    [update],
  )
  const repeat = useCallback(
    () => update(session.repeat(stateRef.current, performance.now())),
    [update],
  )
  const stop = useCallback(() => update(session.stop()), [update])
  const setAutoAdvance = useCallback(
    (on: boolean) => update(session.setAutoAdvance(stateRef.current, on, performance.now())),
    [update],
  )

  return {
    state,
    running: state.phase === 'asking' || state.phase === 'done',
    countdown: session.countdownSeconds(state, now),
    start,
    press,
    skip,
    next,
    repeat,
    stop,
    setAutoAdvance,
  }
}
