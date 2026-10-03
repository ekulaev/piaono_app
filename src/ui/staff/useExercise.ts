import type { WarmupSettings } from '../../engine/warmup/settings'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as exercise from '../../engine/staff/exercise'
import type { ExerciseState } from '../../engine/staff/exercise'
import { UNIFORM, type Weights } from '../../engine/stats/weights'

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

  // Веса подбора нот на всю сессию (C-STF-4): задаются при «Старт».
  const weightsRef = useRef<Weights>(UNIFORM)

  // Итог после «Стоп» — не упражнение: кадры не нужны, кнопка показывает «Старт».
  const running = state.phase !== 'idle' && state.phase !== 'summary'
  useEffect(() => {
    if (!running) return
    let frame = 0
    const loop = () => {
      update(exercise.tick(stateRef.current, performance.now(), Math.random, weightsRef.current))
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [running, update])

  const start = useCallback(
    (weights: Weights, settings: WarmupSettings) => {
      weightsRef.current = weights
      update(exercise.start(performance.now(), Math.random, weights, settings))
    },
    [update],
  )
  /** Меню режимов или «Проверка пианино»: без итога. */
  const stop = useCallback(() => update(exercise.stop()), [update])
  /** «Стоп»: итог, если закончилась хотя бы одна нота. */
  const finish = useCallback(() => update(exercise.finish(stateRef.current)), [update])
  const played = useCallback(
    (pitch: number) => update(exercise.played(stateRef.current, pitch, performance.now())),
    [update],
  )

  return { state, running, start, stop, finish, played }
}
