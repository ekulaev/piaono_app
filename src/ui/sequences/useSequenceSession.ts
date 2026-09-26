import { useCallback, useEffect, useRef, useState } from 'react'
import { buildSession } from '../../engine/sequences/generate'
import * as session from '../../engine/sequences/session'
import type { SessionState } from '../../engine/sequences/session'
import type { SequenceSettings } from '../../engine/sequences/settings'
import type { KeyboardFocus } from '../keyboard/Keyboard'

/**
 * Сессия «Последовательностей» в React: состояние автомата из engine/sequences и цикл кадров,
 * который работает только пока есть открытая группа нажатий или идёт отсчёт.
 */
export function useSequenceSession() {
  const [state, setState] = useState<SessionState>(session.IDLE)
  const stateRef = useRef(state)
  const [now, setNow] = useState(() => performance.now())

  // Диапазон новой последовательности для центрирования клавиатуры (OB-24). Меняется только
  // в начале последовательности, а не на каждом шаге.
  const [focus, setFocus] = useState<KeyboardFocus | null>(null)
  const focusToken = useRef(0)

  const update = useCallback((next: SessionState) => {
    const previous = stateRef.current
    if (next === previous) return
    stateRef.current = next
    setState(next)
    setNow(performance.now())
    if (next.phase === 'playing' && previous.phase !== 'playing') {
      const { low, high } = next.sequences[next.seqIndex]
      setFocus({ low, high, token: ++focusToken.current })
    }
  }, [])

  const needsFrames =
    (state.phase === 'playing' && state.group !== null) ||
    (state.phase === 'finished' && state.countdownUntil !== null)
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
    (settings: SequenceSettings) =>
      update(
        session.startSession(
          buildSession(settings, Math.random),
          settings.autoAdvance,
          performance.now(),
        ),
      ),
    [update],
  )
  const stop = useCallback(() => update(session.stop()), [update])
  const played = useCallback(
    (pitch: number) => update(session.played(stateRef.current, pitch, performance.now())),
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

  return {
    state,
    running: state.phase === 'playing' || state.phase === 'finished',
    countdown: session.countdownSeconds(state, now),
    focus,
    start,
    stop,
    played,
    skip,
    next,
    repeat,
  }
}
