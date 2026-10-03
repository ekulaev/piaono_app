import { useCallback, useEffect, useRef, useState } from 'react'
import { describeNote } from '../../engine/noteEcho/describeNote'
import { fadeMs } from '../../engine/noteEcho/fade'
import {
  addCard,
  EMPTY_SLOTS,
  markLeaving,
  removeCard,
  type EchoSlots,
} from '../../engine/noteEcho/slots'

/**
 * Карточки нажатых нот (C-STF-8). `push` зовётся на каждую сыгранную ноту; у каждой карточки
 * свой таймер, и время показа берётся в момент нажатия — смена настройки старые карточки
 * не трогает (OB-12).
 */
export function useNoteEcho(durationMs: number) {
  const [slots, setSlots] = useState<EchoSlots>(EMPTY_SLOTS)
  const durationRef = useRef(durationMs)
  const nextId = useRef(0)
  const timers = useRef(new Set<number>())

  useEffect(() => {
    durationRef.current = durationMs
  }, [durationMs])

  // Таймеры не переживают компонент: иначе они трогали бы состояние после размонтирования.
  useEffect(() => {
    const active = timers.current
    return () => active.forEach((timer) => window.clearTimeout(timer))
  }, [])

  const push = useCallback((pitch: number) => {
    const id = nextId.current++
    const display = durationRef.current
    const fade = fadeMs(display)
    setSlots((current) => addCard(current, { id, note: describeNote(pitch), fadeMs: fade }))
    // Два таймера: «уходит» за время перехода до конца и удаление в конце — общее время на экране
    // не больше времени показа (OB-10).
    const schedule = (delay: number, action: () => void) => {
      const timer = window.setTimeout(() => {
        timers.current.delete(timer)
        action()
      }, delay)
      timers.current.add(timer)
    }
    schedule(display - fade, () => setSlots((current) => markLeaving(current, id)))
    schedule(display, () => setSlots((current) => removeCard(current, id)))
  }, [])

  /** Убрать все карточки (уход с главного экрана, OB-16). */
  const clear = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
    setSlots((current) => (current === EMPTY_SLOTS ? current : EMPTY_SLOTS))
  }, [])

  return { slots, push, clear }
}
