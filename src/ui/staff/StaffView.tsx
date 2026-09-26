import { useEffect, useLayoutEffect, useRef } from 'react'
import { progress, type ExerciseState } from '../../engine/staff/exercise'
import { drawNote, drawStaff, notePath, type NoteLook, type StaffGeometry } from './staffDrawing'
import { useMusicFont, useStaffGeometry } from './staffHooks'
import './StaffView.css'

interface Props {
  exercise: ExerciseState
}

/**
 * Нотный стан с движущейся нотой. Два слоя SVG: стан (перерисовывается редко) и нота
 * (перерисовывается только при смене ноты или её вида). Движение — CSS transform слоя ноты
 * в requestAnimationFrame: в кадре не участвуют ни React, ни VexFlow.
 */
function StaffView({ exercise }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const geometry = useStaffGeometry(zoneRef)
  const fontReady = useMusicFont()

  const note = exercise.phase === 'moving' || exercise.phase === 'correct' ? exercise.note : null
  const look: NoteLook =
    exercise.phase === 'correct'
      ? 'correct'
      : exercise.phase === 'moving' && exercise.wrongUntil !== null
        ? 'wrong'
        : 'normal'

  // Слой стана: линии всегда, ключ — только вместе с нотой.
  useLayoutEffect(() => {
    if (geometry && fontReady && staffRef.current) {
      drawStaff(staffRef.current, geometry, note?.clef ?? null)
    }
  }, [geometry, fontReady, note?.clef])

  // Текущее состояние для кадров и начального положения ноты — без лишних перерисовок.
  const exerciseRef = useRef(exercise)
  exerciseRef.current = exercise

  // Где нарисована нота и куда ей ехать — для покадрового сдвига.
  const placement = useRef<{ drawnX: number; startX: number; endX: number } | null>(null)

  // Слой ноты: только при смене ноты или её вида (обычная / верная / неверная).
  useLayoutEffect(() => {
    const host = noteRef.current
    if (!host) return
    if (!geometry || !fontReady || !note) {
      host.replaceChildren()
      placement.current = null
      return
    }
    const drawn = drawNote(host, geometry, note, look)
    placement.current = { drawnX: drawn.drawnX, ...notePath(geometry, note.clef, drawn.headWidth) }
    moveNote(host, geometry, placement.current, progress(exerciseRef.current, performance.now()))
  }, [geometry, fontReady, note, look])

  // Движение: каждый кадр сдвигаем слой ноты по текущей доле пути.
  useEffect(() => {
    if (!geometry) return
    let frame = 0
    const loop = () => {
      const host = noteRef.current
      if (host && placement.current) {
        moveNote(
          host,
          geometry,
          placement.current,
          progress(exerciseRef.current, performance.now()),
        )
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [geometry])

  const style = geometry ? { width: geometry.widthPx, height: geometry.heightPx } : undefined
  return (
    <div ref={zoneRef} className="staff-zone">
      <div className="staff" style={style} role="img" aria-label="Нотный стан">
        <div ref={staffRef} className="staff__layer" />
        <div ref={noteRef} className="staff__layer staff__note" />
      </div>
    </div>
  )
}

function moveNote(
  host: HTMLElement,
  geometry: StaffGeometry,
  place: { drawnX: number; startX: number; endX: number },
  share: number,
) {
  const x = place.startX + (place.endX - place.startX) * share
  host.style.transform = `translateX(${(x - place.drawnX) * geometry.scale}px)`
}

export default StaffView
