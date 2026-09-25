import { useCallback, useEffect, useRef, useState } from 'react'
import * as exercise from '../../engine/staff/exercise'
import type { ExerciseState } from '../../engine/staff/exercise'

/**
 * Упражнение в React: состояние автомата из engine/staff плюс цикл кадров, который
 * продвигает его по времени. React перерисовывает только при смене фазы (появилась нота,
 * верно / неверно, пауза), а не каждый кадр.
 */
export function useExercise() {
  const [state, setState] = useState<ExerciseState>(exercise.IDLE)
  const stateRef = useRef(state)

  const update = useCallback((next: ExerciseState) => {
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
  }, [])

  const running = state.phase !== 'idle'
  useEffect(() => {
    if (!running) return
    let frame = 0
    const loop = () => {
      update(exercise.tick(stateRef.current, performance.now(), Math.random))
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [running, update])

  const start = useCallback(() => update(exercise.start(performance.now(), Math.random)), [update])
  const stop = useCallback(() => update(exercise.stop()), [update])
  const played = useCallback(
    (pitch: number) => update(exercise.played(stateRef.current, pitch, performance.now())),
    [update],
  )

  return { state, running, start, stop, played }
}
