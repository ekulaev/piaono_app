import { useCallback, useEffect, useRef } from 'react'
import { repeatDelayMs } from '../../engine/keyboard/layout'

/**
 * Автоповтор для кнопок прокрутки: первый шаг сразу, дальше с ускорением по repeatDelayMs.
 * step() возвращает false, если шагать больше некуда (кнопка заблокирована) — тогда повтор
 * останавливается сам.
 */
export function useAutoRepeat() {
  const timer = useRef<number | undefined>(undefined)

  const stop = useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  const start = useCallback(
    (step: () => boolean) => {
      stop()
      if (!step()) return
      const pressedAt = performance.now()
      // setTimeout-цепочка, а не setInterval: пауза меняется со временем удержания.
      const scheduleNext = () => {
        timer.current = window.setTimeout(
          () => {
            if (step()) scheduleNext()
            else stop()
          },
          repeatDelayMs(performance.now() - pressedAt),
        )
      }
      scheduleNext()
    },
    [stop],
  )

  useEffect(() => stop, [stop])

  return { start, stop }
}
