import { useLayoutEffect, useRef } from 'react'
import type { IntervalTask } from '../../engine/solfege/intervals/generate'
import type { SolfegeState } from '../../engine/solfege/session'
import { useMusicFont, useStaffGeometry } from '../staff/staffHooks'
import { drawSolfegeStaff } from './solfegeDrawing'
import { intervalNotes } from './intervalsView'
import '../staff/StaffView.css'
import './SolfegeStaff.css'
import { useT } from '../i18n/useI18n'

interface Props {
  session: Extract<SolfegeState, { phase: 'asking' | 'done' }>
}

/** Первая буква заглавная: название интервала начинает формулировку («Большая терция»). */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/**
 * Задание «Интервалов» (C-SOL-2): формулировка над станом и стан с нотами. Строка формулировки
 * фиксированной высоты: оценка «✓ / ✗» появляется в ней же, стан не прыгает (C-SOL-1, OB-12).
 */
function SolfegeStaff({ session }: Props) {
  const t = useT()
  const zoneRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)
  const geometry = useStaffGeometry(zoneRef)
  const fontReady = useMusicFont()
  const notes = intervalNotes(session)
  const notesKey = JSON.stringify(notes)

  useLayoutEffect(() => {
    const host = staffRef.current
    if (!host || !geometry || !fontReady) return
    drawSolfegeStaff(host, geometry, JSON.parse(notesKey))
  }, [notesKey, geometry, fontReady])

  const { content } = session.tasks[session.index] as IntervalTask
  const full = t(`interval.full.${content.interval}`)
  const arrow = content.direction === 'up' ? '↑' : '↓'

  let prompt: string
  let result = null
  if (content.variant === 'play') {
    prompt = `${capitalize(full)} ${t(`solfege.direction.${content.direction}`)} ${arrow}`
  } else {
    prompt = t('solfege.intervals.which')
    if (session.phase === 'done') {
      const skipped = session.outcome === 'skip'
      result = (
        <span className={`task-result task-result--${skipped ? 'answer' : 'correct'}`}>
          {skipped ? capitalize(full) : `✓ ${capitalize(full)}`}
        </span>
      )
    } else if (session.wrong?.value) {
      result = (
        <span className="task-result task-result--wrong">
          {`✗ ${t(`interval.short.${session.wrong.value as IntervalTask['content']['interval']}`)}`}
        </span>
      )
    }
  }

  const style = geometry ? { width: geometry.widthPx, height: geometry.heightPx } : undefined
  return (
    <div className="solfege-task">
      <p className="task-prompt" aria-live="polite">
        <span>{prompt}</span>
        {result}
      </p>
      <div ref={zoneRef} className="staff-zone">
        <div className="staff" style={style} role="img" aria-label={t('staff.solfege')}>
          <div ref={staffRef} className="staff__layer" />
        </div>
      </div>
    </div>
  )
}

export default SolfegeStaff
