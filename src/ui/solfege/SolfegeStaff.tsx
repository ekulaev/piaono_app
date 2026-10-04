import { useLayoutEffect, useRef } from 'react'
import type { SolfegeState } from '../../engine/solfege/session'
import { useMusicFont, useStaffGeometry } from '../staff/staffHooks'
import { viewOf } from './views'
import LegendRow from './LegendRow'
import type { LegendLabel } from '../keyboard/Keyboard'
import '../staff/StaffView.css'
import './SolfegeStaff.css'
import { useT } from '../i18n/useI18n'

interface Props {
  session: Extract<SolfegeState, { phase: 'asking' | 'done' }>
  /** Легенда рядом под станом, когда экранной клавиатуры нет (C-APP-5, OB-17); null — не нужна. */
  legendRow?: Readonly<Record<number, LegendLabel>> | null
}

/**
 * Задание сольфеджио (C-SOL-1): формулировка над станом и стан. Что нарисовать и написать —
 * вид режима задания (`views.ts`). Строка формулировки фиксированной высоты: оценка «✓ / ✗»
 * появляется в ней же, стан не прыгает (OB-12).
 */
function SolfegeStaff({ session, legendRow = null }: Props) {
  const t = useT()
  const zoneRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)
  const geometry = useStaffGeometry(zoneRef)
  const fontReady = useMusicFont()
  const picture = viewOf(session.tasks[session.index]).picture(t, session)
  // Последний рисунок без пересоздания эффекта: перерисовка — только по смене ключа.
  const pictureRef = useRef(picture)
  pictureRef.current = picture

  useLayoutEffect(() => {
    const host = staffRef.current
    if (!host || !geometry || !fontReady) return
    pictureRef.current.draw(host, geometry)
  }, [picture.key, geometry, fontReady])

  const { prompt, result } = picture
  const style = geometry ? { width: geometry.widthPx, height: geometry.heightPx } : undefined
  return (
    <div className="solfege-task">
      <p className="task-prompt" aria-live="polite">
        <span>{prompt}</span>
        {result && <span className={`task-result task-result--${result.look}`}>{result.text}</span>}
      </p>
      <div ref={zoneRef} className="staff-zone">
        <div className="staff" style={style} role="img" aria-label={t('staff.solfege')}>
          <div ref={staffRef} className="staff__layer" />
        </div>
      </div>
      {legendRow && <LegendRow labels={legendRow} />}
    </div>
  )
}

export default SolfegeStaff
