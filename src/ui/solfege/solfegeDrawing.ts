// Стан задания сольфеджио через VexFlow (C-SOL-1, C-SOL-2). React здесь нет.
// Стан, геометрия и цвета — те же, что у остальных режимов (staffDrawing). Движения нет:
// при каждой смене задания или оценки стан перерисовывается целиком.

import { Accidental, StaveNote, TickContext, type RenderContext } from 'vexflow/bravura'
import { stepLetter, stepOctave } from '../../engine/warmup/steps'
import {
  cssColor,
  LEDGER_WIDTH,
  LINE_WIDTH,
  makeStave,
  prepareContext,
  SPACING,
  vexAccidental,
  type StaffGeometry,
} from '../staff/staffDrawing'

/**
 * Как выглядит нота: обычная; верная — зелёная со сплошным кольцом; неверная — красная с
 * пунктирным кольцом; показанный при пропуске ответ — зелёный в квадратной рамке.
 */
export type SolfegeNoteLook = 'normal' | 'correct' | 'wrong' | 'answer'

export interface SolfegeNote {
  /** Ступень на стане (C4 = 28) и знак у ноты. */
  step: number
  accidental: -1 | 0 | 1
  look: SolfegeNoteLook
}

/** Ноты стоят на равных местах слева направо: первая, вторая (или ответ), неверная. */
const SLOTS = 3
/** Отступ последнего места от правого края стана, условные единицы. */
const RIGHT_PADDING = 40

function colorOf(look: SolfegeNoteLook): string {
  if (look === 'correct' || look === 'answer') return cssColor('--note-correct')
  if (look === 'wrong') return cssColor('--note-wrong')
  return cssColor('--ink')
}

function strokeShape(context: RenderContext, color: string, dash: number[], draw: () => void) {
  context.save()
  context.setStrokeStyle(color)
  context.setLineWidth(3)
  context.setLineDash(dash)
  context.beginPath()
  draw()
  context.stroke()
  context.restore()
}

/** Скрипичный ключ и до трёх целых нот со знаками и отметками. */
export function drawSolfegeStaff(host: HTMLElement, geometry: StaffGeometry, notes: SolfegeNote[]) {
  const context = prepareContext(host, geometry)
  const ink = cssColor('--ink')
  const stave = makeStave(geometry, 'treble')
  context.setLineWidth(LINE_WIDTH)
  context.setStrokeStyle(ink)
  context.setFillStyle(ink)
  stave.setContext(context).draw()

  const noteStart = stave.getNoteStartX()
  const gap = (geometry.virtualWidth - RIGHT_PADDING - noteStart) / SLOTS

  notes.forEach((view, index) => {
    const color = colorOf(view.look)
    const note = new StaveNote({
      keys: [`${stepLetter(view.step).toLowerCase()}/${stepOctave(view.step)}`],
      duration: 'w',
      clef: 'treble',
    })
    const accidental = vexAccidental(view.accidental)
    if (accidental) note.addModifier(new Accidental(accidental), 0)
    note.setStave(makeStave(geometry, 'treble'))
    note.setStyle({ fillStyle: color, strokeStyle: color })
    note.setLedgerLineStyle({ strokeStyle: color, lineWidth: LEDGER_WIDTH })
    note
      .getModifiers()
      .forEach((modifier) => modifier.setStyle({ fillStyle: color, strokeStyle: color }))
    new TickContext()
      .addTickable(note)
      .preFormat()
      .setX(gap * (index + 0.5))
    note.setContext(context).draw()

    const centerX = note.getAbsoluteX() + note.getGlyphWidth() / 2
    const y = note.getYs()[0]
    if (view.look === 'correct' || view.look === 'wrong') {
      strokeShape(context, color, view.look === 'wrong' ? [5, 4] : [], () =>
        context.arc(centerX, y, SPACING * 1.6, 0, Math.PI * 2, false),
      )
    }
    if (view.look === 'answer') {
      const pad = SPACING * 1.5
      strokeShape(context, color, [], () => context.rect(centerX - pad, y - pad, pad * 2, pad * 2))
    }
  })
}
