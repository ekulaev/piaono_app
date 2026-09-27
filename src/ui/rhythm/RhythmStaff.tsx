import { useLayoutEffect, useMemo, useRef } from 'react'
import type { RhythmState } from '../../engine/rhythm/session'
import { useMusicFont, useStaffGeometry } from '../staff/staffHooks'
import { drawRhythm, fitRhythmGeometry, type NoteLook } from './rhythmDrawing'
import '../staff/StaffView.css'

interface Props {
  session: RhythmState
}

/** Вид нот рисунка по состоянию автомата. */
function looksOf(session: RhythmState): NoteLook[] {
  if (session.phase === 'idle' || session.phase === 'summary') return []
  const count = session.patterns[session.index].notes.length
  if (session.phase === 'evaluated') return session.marks
  const played = session.phase === 'tapping' ? session.taps.length : 0
  return Array.from({ length: count }, (_, i) =>
    i < played ? 'played' : i === played ? 'current' : 'pending',
  )
}

/** Стан «Ритма». Статичный SVG: перерисовка при каждой смене состояния. */
function RhythmStaff({ session }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)
  const zoneGeometry = useStaffGeometry(zoneRef)
  // Рисунки сессии — один массив на всю сессию; по нему масштаб подобран один раз.
  const patterns = session.phase === 'idle' || session.phase === 'summary' ? null : session.patterns
  const geometry = useMemo(
    () => zoneGeometry && (patterns ? fitRhythmGeometry(zoneGeometry, patterns) : zoneGeometry),
    [zoneGeometry, patterns],
  )
  const fontReady = useMusicFont()
  const drawnKey = useRef('')

  useLayoutEffect(() => {
    const host = staffRef.current
    if (!host || !geometry || !fontReady) return
    if (session.phase === 'idle' || session.phase === 'summary') {
      host.replaceChildren()
      drawnKey.current = ''
      return
    }
    const view = { pattern: session.patterns[session.index], looks: looksOf(session) }
    // Лишний удар аккорда не меняет вид — не перерисовываем.
    const key = JSON.stringify([view, session.index, geometry])
    if (key === drawnKey.current) return
    drawnKey.current = key
    drawRhythm(host, geometry, view)
  }, [session, geometry, fontReady])

  const style = geometry ? { width: geometry.widthPx, height: geometry.heightPx } : undefined
  return (
    <div ref={zoneRef} className="staff-zone">
      <div className="staff" style={style} role="img" aria-label="Ритмический рисунок">
        <div ref={staffRef} className="staff__layer" />
      </div>
    </div>
  )
}

export default RhythmStaff
