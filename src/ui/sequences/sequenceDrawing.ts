// Отрисовка последовательности режима «Последовательности» через VexFlow. React здесь нет.
// Стан, геометрия и цвета — те же, что у «Разминки» (staffDrawing).

import { StaveNote, SVGContext, TickContext, type RenderContext } from 'vexflow/bravura'
import { intervalBetween, type Interval } from '../../engine/sequences/anchors'
import type { HintVisibility } from '../../engine/sequences/hints'
import type { Clef } from '../../engine/staff/pickNote'
import { pitchToNoteName } from '../../midi/noteNames'
import {
  cssColor,
  LEDGER_WIDTH,
  LINE_WIDTH,
  makeStave,
  prepareContext,
  SPACING,
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
  /** Опорная нота последовательности; null — у аккордов. */
  anchor: number | null
  /** Что показано в полосе подсказок; null — подсказок в сессии нет (и места якоря тоже). */
  visibility: HintVisibility | null
}

/** Отступ последнего шага от правого края стана, условные единицы. */
const RIGHT_PADDING = 30
/** Черта под станом, отмечающая текущий шаг: ниже двух добавочных линий (от верхней линии). */
const CURRENT_BAR_OFFSET = 4 * SPACING + 34

/**
 * Подсказки в полосе над станом. Размер шрифта 30 единиц — высота цифры около 21 единицы,
 * не меньше двух промежутков стана (C-STF-3, NFR-1). Базовая линия — у нижнего края полосы.
 */
const HINT_FONT_SIZE = 30
const HINT_BASELINE_FROM_BOTTOM = 7
const HINT_FONT = 'system-ui, "Segoe UI", Roboto, sans-serif'
/** Стрелка рядом с цифрой: высота как у цифры, толстая — видна боковым зрением. */
const ARROW = { height: 21, headHeight: 9, headWidth: 13, stemWidth: 4, gap: 4 }

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
 * Подпись в полосе подсказок по центру точки x. Шрифт и цвет задаются при каждом вызове:
 * рисуя ноты, VexFlow переключает шрифт контекста на нотный. Размер — строкой в px: число
 * VexFlow считает в пунктах (pt). text-anchor применяется к элементу, который создаст fillText.
 */
function hintText(context: RenderContext, text: string, x: number, baseline: number) {
  context.save()
  context.setFont(HINT_FONT, `${HINT_FONT_SIZE}px`, 600)
  context.setFillStyle(cssColor('--ink'))
  if (context instanceof SVGContext) context.attributes['text-anchor'] = 'middle'
  context.fillText(text, x, baseline)
  context.restore()
}

/** Стрелка вверх или вниз: стержень и треугольный наконечник, залитые одним путём. */
function drawArrow(context: RenderContext, centerX: number, top: number, up: boolean) {
  const { height, headHeight, headWidth, stemWidth } = ARROW
  const tipY = up ? top : top + height
  const baseY = up ? top + headHeight : top + height - headHeight
  const tailY = up ? top + height : top
  context.beginPath()
  context.moveTo(centerX, tipY)
  context.lineTo(centerX + headWidth / 2, baseY)
  context.lineTo(centerX + stemWidth / 2, baseY)
  context.lineTo(centerX + stemWidth / 2, tailY)
  context.lineTo(centerX - stemWidth / 2, tailY)
  context.lineTo(centerX - stemWidth / 2, baseY)
  context.lineTo(centerX - headWidth / 2, baseY)
  context.closePath()
  context.fill()
}

/**
 * Подсказка интервала над позицией: стрелка слева, число справа, вместе — по центру.
 * Стрелка есть всегда, поэтому подсказку не спутать с цифрой аппликатуры (C-STF-3, OB-14).
 */
function drawIntervalHint(
  context: RenderContext,
  interval: Interval,
  centerX: number,
  baseline: number,
) {
  const digitWidth = HINT_FONT_SIZE * 0.56
  const total = ARROW.headWidth + ARROW.gap + digitWidth
  const left = centerX - total / 2
  drawArrow(
    context,
    left + ARROW.headWidth / 2,
    baseline - ARROW.height,
    interval.direction === 'up',
  )
  hintText(
    context,
    String(interval.size),
    left + ARROW.headWidth + ARROW.gap + digitWidth / 2,
    baseline,
  )
}

/**
 * Весь стан заново: ключ, якорь, шаги с отметками, подсказки, полые неверные головки.
 * Движения нет, поэтому перерисовка целиком при каждой смене состояния проще и надёжнее
 * частичной.
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

  // Позиции равномерно от ключа до правого края; getAbsoluteX добавляет начало нот стана.
  // С подсказками первая позиция отведена якорю всю сессию — видим он или нет (OB-11),
  // поэтому шаги не сдвигаются, когда подсказки появляются и исчезают.
  const { visibility, anchor } = view
  const hints = visibility !== null && anchor !== null
  const firstStep = hints ? 1 : 0
  const noteStart = stave.getNoteStartX()
  const available = geometry.virtualWidth - RIGHT_PADDING - noteStart
  const gap = available / (view.steps.length + firstStep)
  const currentBarY = geometry.staveY + CURRENT_BAR_OFFSET
  const hintBaseline = geometry.hintBand - HINT_BASELINE_FROM_BOTTOM

  if (hints && visibility.anchor) {
    // Якорь — полая головка основного цвета; не играется (OB-12).
    const anchorNote = makeNote([anchor], view.clef, 'w', ink, 0, geometry)
    anchorNote.setContext(context).draw()
    if (visibility.anchorLabel) {
      const centerX = anchorNote.getAbsoluteX() + anchorNote.getGlyphWidth() / 2
      hintText(context, pitchToNoteName(anchor), centerX, hintBaseline)
    }
  }

  view.steps.forEach((keys, index) => {
    const mark = view.marks[index]
    const color = colors[mark]
    const isCurrent = mark === 'current'
    const x = gap * (index + firstStep)
    // Текущий шаг — в своей группе: её CSS пульсирует или обводит рамкой при ошибке.
    if (isCurrent) {
      // VexFlow добавляет к имени группы приставку «vf-»: в CSS это .vf-seq-step-pulse.
      context.openGroup(view.pulse ? 'seq-step-pulse' : 'seq-step')
    }
    const note = makeNote(keys, view.clef, 'q', color, x, geometry)
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
      context.fillRect(centerX - headWidth, currentBarY, headWidth * 2, 5)
      context.restore()

      if (view.wrongPitches.length > 0) {
        const wrong = makeNote(
          [...view.wrongPitches].sort((a, b) => a - b),
          view.clef,
          'w',
          cssColor('--note-wrong'),
          x + headWidth * 2.5,
          geometry,
        )
        wrong.setContext(context).draw()
      }
    }

    // Подсказка — вне группы текущего шага: не пульсирует с ним и не берёт его акцентный цвет.
    if (hints && visibility.steps[index]) {
      // Интервал от предыдущей записанной ноты, у первого шага — от якоря (OB-14).
      const from = index === 0 ? anchor : view.steps[index - 1][0]
      context.save()
      context.setFillStyle(ink)
      drawIntervalHint(context, intervalBetween(from, keys[0]), centerX, hintBaseline)
      context.restore()
    }
  })
}
