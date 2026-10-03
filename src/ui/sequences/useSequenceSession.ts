import { useCallback, useEffect, useRef, useState } from 'react'
import { buildSession } from '../../engine/sequences/generate'
import * as session from '../../engine/sequences/session'
import type { HintProgress } from '../../engine/sequences/hints'
import type { ModeStats } from '../../engine/stats/stats'
import { weightsFor } from '../../engine/stats/weights'
import type { SessionState, StepCheck } from '../../engine/sequences/session'
import type { SequenceSettings } from '../../engine/sequences/settings'

/**
 * Сессия «Последовательностей» в React: состояние автомата из engine/sequences и цикл кадров,
 * который работает только пока есть открытая группа нажатий или идёт отсчёт.
 */
export function useSequenceSession(
  /** Показать диапазон новой последовательности на клавиатуре (центрировать на нём). */
  requestFocus: (low: number, high: number) => void,
) {
  const [state, setState] = useState<SessionState>(session.IDLE)
  const stateRef = useRef(state)
  const [now, setNow] = useState(() => performance.now())

  const update = useCallback(
    (next: SessionState) => {
      const previous = stateRef.current
      if (next === previous) return
      stateRef.current = next
      setState(next)
      setNow(performance.now())
      if (next.phase === 'playing' && previous.phase !== 'playing') {
        const { low, high } = next.sequences[next.seqIndex]
        // Только в начале последовательности, а не на каждом шаге (OB-24).
        requestFocus(low, high)
      }
    },
    [requestFocus],
  )

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

  /**
   * hints — уровни подсказок (null — подсказки в этой сессии не действуют); stats — история
   * режима: по ней трудные места выбираются чаще, и с ней сравнивается итог (C-STF-4);
   * check — «Последовательности» (точные ноты) или «Контур» (направление, C-STF-5).
   */
  const start = useCallback(
    (
      settings: SequenceSettings,
      hints: HintProgress | null,
      stats: ModeStats,
      check: StepCheck = 'exact',
    ) =>
      update(
        session.startSession(
          buildSession(settings, Math.random, weightsFor(stats), { contour: check === 'contour' }),
          settings.autoAdvance,
          performance.now(),
          hints,
          stats,
          check,
        ),
      ),
    [update],
  )
  const setAutoAdvance = useCallback(
    (on: boolean) => update(session.setAutoAdvance(stateRef.current, on, performance.now())),
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
    start,
    stop,
    played,
    skip,
    next,
    repeat,
    setAutoAdvance,
  }
}
