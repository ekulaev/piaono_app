import { useLayoutEffect, useRef } from 'react'
import type { SessionState } from '../../engine/sequences/session'
import { useMusicFont, useStaffGeometry } from '../staff/staffHooks'
import { drawSequence, type StepMark } from './sequenceDrawing'
import '../staff/StaffView.css'
import './SequenceStaff.css'

interface Props {
  session: SessionState
}

/** Стан режима «Последовательности». Статичный SVG: перерисовка при каждой смене сессии. */
function SequenceStaff({ session }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const staffRef = useRef<HTMLDivElement>(null)
  const geometry = useStaffGeometry(zoneRef)
  const fontReady = useMusicFont()
  // Ключ последней отрисовки. Каждая отрисовка создаёт SVG заново и тем перезапускает
  // пульсацию, поэтому одинаковый вид (например, закрылась группа нажатий без ошибки) не
  // перерисовываем. errorCount в ключе: повторная такая же ошибка снова пульсирует.
  const drawnKey = useRef('')

  useLayoutEffect(() => {
    const host = staffRef.current
    if (!host || !geometry || !fontReady) return
    if (session.phase !== 'playing' && session.phase !== 'finished') {
      host.replaceChildren()
      drawnKey.current = ''
      return
    }
    const sequence = session.sequences[session.seqIndex]
    const playing = session.phase === 'playing' ? session : null
    const marks: StepMark[] = session.records.map((record, index) => {
      if (record.result === 'correct') return 'correct'
      if (record.result === 'skipped') return 'skipped'
      return playing && index === playing.stepIndex ? 'current' : 'pending'
    })
    const currentHadError = playing ? playing.records[playing.stepIndex].hadError : false
    const view = {
      clef: sequence.clef,
      steps: sequence.steps,
      marks,
      currentHadError,
      pulse: currentHadError,
      wrongPitches: playing?.wrongPitches ?? [],
    }
    const key = JSON.stringify([view, playing?.errorCount, session.seqIndex, geometry])
    if (key === drawnKey.current) return
    drawnKey.current = key
    drawSequence(host, geometry, view)
  }, [session, geometry, fontReady])

  const style = geometry ? { width: geometry.widthPx, height: geometry.heightPx } : undefined
  return (
    <div ref={zoneRef} className="staff-zone">
      <div
        className="staff"
        style={style}
        role="img"
        aria-label="Нотный стан с последовательностью"
      >
        <div ref={staffRef} className="staff__layer" />
      </div>
    </div>
  )
}

export default SequenceStaff
