// Стан задания сольфеджио через VexFlow (C-SOL-1, C-SOL-2). React здесь нет.
// Стан, геометрия и цвета — те же, что у остальных режимов (staffDrawing). Движения нет:
// при каждой смене задания или оценки стан перерисовывается целиком.

import { Accidental, Beam, StaveNote, TickContext, type RenderContext } from 'vexflow/bravura'
import type { DurationId, SignKind } from '../../engine/solfege/durations/durations'
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

/**
 * Квадратная рамка контуром. Не context.rect: в SVG VexFlow он берёт свой цвет, а не цвет
 * штриха, и рамка выходила чёрной вместо зелёной (C-SOL-1, OB-12).
 */
function framePath(context: RenderContext, x: number, y: number, w: number, h: number) {
  context.moveTo(x, y)
  context.lineTo(x + w, y)
  context.lineTo(x + w, y + h)
  context.lineTo(x, y + h)
  context.closePath()
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
      strokeShape(context, color, [], () =>
        framePath(context, centerX - pad, y - pad, pad * 2, pad * 2),
      )
    }
  })
}

/** Знак задания «Длительностей»: нота, пауза или группа под ребром (C-SOL-3, OB-1). */
export interface DurationSign {
  kind: SignKind
  duration: DurationId
  /** Ступени нот слева направо; у паузы пусто. */
  steps: readonly number[]
  /** Обычный, верный (зелёный в кольце) или показанный при пропуске (зелёный в рамке). */
  look: Exclude<SolfegeNoteLook, 'wrong'>
}

/** Расстояние между нотами группы, условные единицы: не меньше трёх головок (как в «Ритме»). */
const GROUP_STEP = 42

/**
 * Скрипичный ключ и один знак по центру стана. Целая пауза висит под четвёртой линией,
 * половинная лежит на третьей (OB-4). Штиль — по высоте ноты (OB-3);
 * у группы — общий для всех нот и рёбра вместо флажков (OB-13).
 */
export function drawDurationSign(host: HTMLElement, geometry: StaffGeometry, sign: DurationSign) {
  const context = prepareContext(host, geometry)
  const ink = cssColor('--ink')
  const stave = makeStave(geometry, 'treble')
  context.setLineWidth(LINE_WIDTH)
  context.setStrokeStyle(ink)
  context.setFillStyle(ink)
  stave.setContext(context).draw()

  const color = sign.look === 'normal' ? ink : colorOf(sign.look)
  // Целая пауза висит под четвёртой линией (ре второй октавы), остальные — на средней (OB-4).
  const keys =
    sign.kind === 'rest'
      ? [sign.duration === 'w' ? 'd/5' : 'b/4']
      : sign.steps.map((step) => `${stepLetter(step).toLowerCase()}/${stepOctave(step)}`)
  const notes = keys.map(
    (key) =>
      new StaveNote({
        keys: [key],
        duration: sign.duration + (sign.kind === 'rest' ? 'r' : ''),
        clef: 'treble',
        autoStem: sign.kind === 'note',
      }),
  )

  const center = (geometry.virtualWidth + stave.getNoteStartX()) / 2
  notes.forEach((note, index) => {
    note.setStave(stave)
    note.setStyle({ fillStyle: color, strokeStyle: color })
    note.setLedgerLineStyle({ strokeStyle: color, lineWidth: LEDGER_WIDTH })
    const offset = (index - (notes.length - 1) / 2) * GROUP_STEP
    new TickContext()
      .addTickable(note)
      .preFormat()
      .setX(center + offset - stave.getNoteStartX())
  })
  // Рёбра создаются до рисования нот: они снимают флажки и выравнивают штили группы.
  const beam = sign.kind === 'group' ? new Beam(notes, true) : null
  for (const note of notes) note.setContext(context).draw()
  if (beam) {
    // Ребро заливается текущим цветом контекста, а не своим стилем — задаём цвет явно.
    context.save()
    context.setFillStyle(color)
    context.setStrokeStyle(color)
    beam.setStyle({ fillStyle: color, strokeStyle: color })
    beam.setContext(context).draw()
    context.restore()
  }

  if (sign.look === 'normal') return
  // Отметка вокруг всего знака: форма дублирует цвет (C-SOL-1, OB-12).
  const [first, ...rest] = notes.map((note) => note.getBoundingBox())
  const box = rest.reduce((all, next) => all.mergeWith(next), first)
  const pad = SPACING * 0.8
  const x = box.getX() - pad
  const y = box.getY() - pad
  const w = box.getW() + pad * 2
  const h = box.getH() + pad * 2
  if (sign.look === 'answer') {
    strokeShape(context, color, [], () => framePath(context, x, y, w, h))
  } else {
    strokeShape(context, color, [], () =>
      context.arc(x + w / 2, y + h / 2, Math.max(w, h) / 2 + pad, 0, Math.PI * 2, false),
    )
  }
}
