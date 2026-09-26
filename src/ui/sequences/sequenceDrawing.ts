// Отрисовка последовательности режима «Последовательности» через VexFlow. React здесь нет.
// Стан, геометрия и цвета — те же, что у «Разминки» (staffDrawing).

import { StaveNote, TickContext, type RenderContext } from 'vexflow/bravura'
import type { Clef } from '../../engine/staff/pickNote'
import {
  cssColor,
  LEDGER_WIDTH,
  LINE_WIDTH,
  makeStave,
  prepareContext,
  SPACING,
  TOP_MARGIN,
  vexKey,
  type StaffGeometry,
} from '../staff/staffDrawing'

export type StepMark = 'pending' | 'current' | 'correct' | 'skipped'

export interface SequenceView {
  clef: Clef
  steps: number[][]
  marks: StepMark[]
  /** Была ли ошибка на текущем шаге (для рамки при «уменьшить движение»). */
  currentHadError: boolean
  /** Пульсировать текущим шагом: на нём ошибка. Анимация идёт при создании SVG, один раз. */
  pulse: boolean
  /** Неверные ноты — полые головки правее текущего шага. */
  wrongPitches: number[]
}

/** Отступ последнего шага от правого края стана, условные единицы. */
const RIGHT_PADDING = 30
/** Черта под станом, отмечающая текущий шаг: ниже двух добавочных линий. */
const CURRENT_BAR_Y = TOP_MARGIN + 4 * SPACING + 34

function makeNote(
  keys: number[],
  clef: Clef,
  duration: 'q' | 'w',
  color: string,
  x: number,
  geometry: StaffGeometry,
) {
  const note = new StaveNote({ keys: keys.map(vexKey), duration, clef })
  note.setStave(makeStave(geometry, clef))
  // Шаги — закрашенные головки без штилей: ни ритма, ни длительностей в режиме нет.
  note.getStem()?.setVisibility(false)
  note.setStyle({ fillStyle: color, strokeStyle: color })
  note.setLedgerLineStyle({ strokeStyle: color, lineWidth: LEDGER_WIDTH })
  new TickContext().addTickable(note).preFormat().setX(x)
  return note
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

/**
 * Весь стан заново: ключ, шаги с отметками, полые неверные головки. Движения нет,
 * поэтому перерисовка целиком при каждой смене состояния проще и надёжнее частичной.
 */
export function drawSequence(host: HTMLElement, geometry: StaffGeometry, view: SequenceView) {
  const context = prepareContext(host, geometry)
  const ink = cssColor('--ink')
  const colors: Record<StepMark, string> = {
    pending: ink,
    current: cssColor('--note-current'),
    correct: cssColor('--note-correct'),
    skipped: cssColor('--ink-soft'),
  }

  const stave = makeStave(geometry, view.clef)
  context.setLineWidth(LINE_WIDTH)
  context.setStrokeStyle(ink)
  context.setFillStyle(ink)
  stave.setContext(context).draw()

  // Шаги равномерно от ключа до правого края; getAbsoluteX добавляет начало нот стана.
  const noteStart = stave.getNoteStartX()
  const available = geometry.virtualWidth - RIGHT_PADDING - noteStart
  const gap = available / view.steps.length

  view.steps.forEach((keys, index) => {
    const mark = view.marks[index]
    const color = colors[mark]
    const isCurrent = mark === 'current'
    // Текущий шаг — в своей группе: её CSS пульсирует или обводит рамкой при ошибке.
    if (isCurrent) {
      // VexFlow добавляет к имени группы приставку «vf-»: в CSS это .vf-seq-step-pulse.
      context.openGroup(view.pulse ? 'seq-step-pulse' : 'seq-step')
    }
    const note = makeNote(keys, view.clef, 'q', color, gap * index, geometry)
    note.setContext(context).draw()

    const headWidth = note.getGlyphWidth()
    const centerX = note.getAbsoluteX() + headWidth / 2
    const ys = note.getYs()
    const top = Math.min(...ys)
    const bottom = Math.max(...ys)

    if (mark === 'correct') {
      for (const y of ys) {
        strokeShape(context, color, [], () =>
          context.arc(centerX, y, SPACING * 1.4, 0, Math.PI * 2, false),
        )
      }
    }
    if (mark === 'skipped') {
      const pad = SPACING * 1.3
      strokeShape(context, color, [], () =>
        context.rect(centerX - pad, top - pad, pad * 2, bottom - top + pad * 2),
      )
    }
    if (isCurrent) {
      if (view.currentHadError) {
        // Рамка видна только при «уменьшить движение» (см. SequenceStaff.css).
        context.openGroup('seq-step-error-frame')
        const pad = SPACING * 1.5
        strokeShape(context, cssColor('--note-wrong'), [6, 4], () =>
          context.rect(centerX - pad, top - pad, pad * 2, bottom - top + pad * 2),
        )
        context.closeGroup()
      }
      context.closeGroup()
      // Черта под станом: текущий шаг заметен не только по цвету.
      context.save()
      context.setFillStyle(color)
      context.fillRect(centerX - headWidth, CURRENT_BAR_Y, headWidth * 2, 5)
      context.restore()

      if (view.wrongPitches.length > 0) {
        const wrong = makeNote(
          [...view.wrongPitches].sort((a, b) => a - b),
          view.clef,
          'w',
          cssColor('--note-wrong'),
          gap * index + headWidth * 2.5,
          geometry,
        )
        wrong.setContext(context).draw()
      }
    }
  })
}
