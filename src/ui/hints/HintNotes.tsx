import { useLayoutEffect, useRef } from 'react'
import { notesOf } from '../../engine/rhythm/generate'
import { drawRhythm, fitRhythmGeometry } from '../rhythm/rhythmDrawing'
import { drawSequence } from '../sequences/sequenceDrawing'
import { HINT_BAND } from '../staff/staffDrawing'
import { useMusicFont, useStaffGeometry } from '../staff/staffHooks'
import type { HintBlock } from './hints'
import '../staff/StaffView.css'

type NotesBlock = Extract<HintBlock, { kind: 'notes' | 'rhythm' }>

/**
 * Нотный или ритмический пример в подсказке: тот же код отрисовки, что в упражнениях, без
 * отметок игры. Ширина — по окну, поэтому пример не бывает шире окна (горизонтальной прокрутки нет).
 */
function HintNotes({ block }: { block: NotesBlock }) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const withBand = block.kind === 'notes' && block.intervals === true
  const geometry = useStaffGeometry(zoneRef, withBand ? HINT_BAND : 0)
  const fontReady = useMusicFont()

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host || !geometry || !fontReady) return
    if (block.kind === 'notes') {
      const anchor = block.anchor ?? null
      drawSequence(host, geometry, {
        clef: block.clef,
        steps: block.pitches.map((pitch) => [pitch]),
        marks: block.pitches.map(() => 'pending'),
        currentHadError: false,
        pulse: false,
        wrongPitches: [],
        anchor,
        visibility:
          anchor === null
            ? null
            : {
                anchor: true,
                anchorLabel: true,
                steps: block.pitches.map(() => block.intervals === true),
              },
      })
    } else {
      const pattern = { meter: block.meter, bars: [block.figures], notes: notesOf([block.figures]) }
      drawRhythm(host, fitRhythmGeometry(geometry, [pattern]), {
        pattern,
        looks: block.marks ?? pattern.notes.map(() => 'pending'),
      })
    }
  }, [block, geometry, fontReady])

  const style = geometry ? { width: geometry.widthPx, height: geometry.heightPx } : undefined
  return (
    <div ref={zoneRef} className={`staff-zone hint__notes${withBand ? ' hint__notes--band' : ''}`}>
      <div className="staff" style={style} role="img" aria-label="Нотный пример">
        <div ref={hostRef} className="staff__layer" />
      </div>
    </div>
  )
}

export default HintNotes
