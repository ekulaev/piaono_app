import { useCallback, useRef, useState } from 'react'
import { buildRhythmSession } from '../../engine/rhythm/generate'
import * as session from '../../engine/rhythm/session'
import type { RhythmSettings } from '../../engine/rhythm/settings'
import type { RhythmState } from '../../engine/rhythm/session'
import type { ModeStats } from '../../engine/stats/stats'
import { figureWeights } from '../../engine/stats/weights'

/**
 * Сессия «Ритма» в React: состояние автомата из engine/rhythm. Цикла кадров нет — таймеров в
 * режиме нет, всё меняется только от ударов и кнопок.
 */
export function useRhythmSession() {
  const [state, setState] = useState<RhythmState>(session.IDLE)
  const stateRef = useRef(state)

  const update = useCallback((next: RhythmState) => {
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
  }, [])

  /** stats — история «Ритма»: по ней трудные фигуры выпадают чаще, с ней сравнивается итог. */
  const start = useCallback(
    (settings: RhythmSettings, stats: ModeStats) =>
      update(
        session.startRhythm(buildRhythmSession(settings, Math.random, figureWeights(stats)), stats),
      ),
    [update],
  )
  /** Удар в момент нажатия time (из события пианино или касания). */
  const played = useCallback(
    (time: number) => update(session.tap(stateRef.current, time)),
    [update],
  )
  const skip = useCallback(() => update(session.skip(stateRef.current)), [update])
  const restart = useCallback(() => update(session.restart(stateRef.current)), [update])
  const next = useCallback(() => update(session.next(stateRef.current)), [update])
  const repeat = useCallback(() => update(session.repeat(stateRef.current)), [update])
  const stop = useCallback(() => update(session.stop()), [update])

  const running = state.phase !== 'idle' && state.phase !== 'summary'
  return { state, running, start, played, skip, restart, next, repeat, stop }
}
