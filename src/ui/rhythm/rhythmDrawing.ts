// Отрисовка рисунка «Ритма» через VexFlow (C-STF-6, OB-3, OB-8). React здесь нет.
// Стан — одна линия: высота нот не важна, важны только длительности.

import { Beam, Dot, Stave, StaveNote, TickContext, type RenderContext } from 'vexflow/bravura'
import { FIGURES, TICKS_PER_BEAT } from '../../engine/rhythm/figures'
import type { Mark } from '../../engine/rhythm/evaluate'
import type { Pattern } from '../../engine/rhythm/generate'
import {
  cssColor,
  LINE_WIDTH,
  prepareContext,
  SPACING,
  TOP_MARGIN,
  type StaffGeometry,
} from '../staff/staffDrawing'

/** Что показано у ноты рисунка. */
export type NoteLook = 'pending' | 'current' | 'played' | Mark

export interface RhythmView {
  pattern: Pattern
  /** Вид каждой ноты рисунка (паузы не входят), по порядку. */
  looks: NoteLook[]
}

/** Все ноты — на средней линии. */
const KEY = 'b/4'
/** Отступ последней доли от правого края стана, условные единицы. */
const RIGHT_PADDING = 30
/** Место под тактовую черту между тактами, в долях восьмой. */
const BAR_GAP_TICKS = 1
/** Черта под станом у текущей и сыгранных нот (от верхней линии, как у «Последовательностей»). */
const BAR_Y = 4 * SPACING + 34
/** Треугольник «рано»/«поздно» под нотой: крупный, виден боковым зрением. */
const TRIANGLE = { top: 4 * SPACING + 8, height: 18, width: 20 }

/** Ширина закрашенной головки Bravura, условные единицы. */
const HEAD_WIDTH = 13
/** Между центрами соседних нот — не меньше трёх головок: промежуток не меньше двух (NFR-3). */
const MIN_NOTE_STEP = 3 * HEAD_WIDTH
/** Высота стана с полями, условные единицы (как у staffGeometry без полосы подсказок). */
const VIRTUAL_HEIGHT = TOP_MARGIN * 2 + 4 * SPACING

/** Клеток (восьмых) по ширине рисунка: такты и место под черты между ними. */
const cellsOf = (pattern: Pattern) => {
  const barTicks = pattern.meter * TICKS_PER_BEAT
  return pattern.bars.length * barTicks + (pattern.bars.length - 1) * BAR_GAP_TICKS
}

/** Самая короткая длительность рисунка (нота или пауза), тики. */
const shortestItem = (pattern: Pattern) =>
  Math.min(...pattern.bars.flat().flatMap((id) => FIGURES[id].items.map((item) => item.ticks)))

/**
 * Геометрия под рисунки сессии. Места нот пропорциональны длительностям, поэтому в плотном
 * рисунке (2 такта восьмых) крупные ноты не помещаются: тогда масштаб уменьшается так, чтобы
 * между соседними нотами было не меньше двух головок. Масштаб один на всю сессию — ноты не
 * меняют размер от рисунка к рисунку. Стан по вертикали — в середине зоны.
 */
export function fitRhythmGeometry(
  base: StaffGeometry,
  patterns: readonly Pattern[],
): StaffGeometry {
  const noteStart = makeRhythmStave(base, 4).getNoteStartX() + SPACING
  const cells = Math.max(...patterns.map((p) => cellsOf(p) / shortestItem(p)))
  const needed = noteStart + RIGHT_PADDING + cells * MIN_NOTE_STEP
  const scale = Math.min(base.scale, base.widthPx / needed)
  if (scale === base.scale) return base
  return {
    ...base,
    scale,
    virtualWidth: base.widthPx / scale,
    staveY: TOP_MARGIN + (base.heightPx / scale - VIRTUAL_HEIGHT) / 2,
  }
}

/**
 * Стан из пяти линий, из которых видна только средняя: так ноты, паузы и размер VexFlow ставит
 * на свои обычные места, а ученик видит одну линию.
 */
function makeRhythmStave(geometry: StaffGeometry, meter: number): Stave {
  const stave = new Stave(0, geometry.staveY, geometry.virtualWidth, {
    leftBar: false,
    rightBar: false,
    spaceAboveStaffLn: 0,
  })
  stave.setConfigForLines([0, 1, 2, 3, 4].map((line) => ({ visible: line === 2 })))
  stave.addTimeSignature(`${meter}/4`)
  return stave
}

/** Длительность VexFlow по тикам: 4 — половинная, 3 — четверть с точкой, 2 — четверть, 1 — восьмая. */
const DURATIONS: Record<number, string> = { 4: 'h', 3: 'q', 2: 'q', 1: '8' }

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

/** Залитый треугольник остриём влево («рано») или вправо («поздно»). */
function drawTriangle(context: RenderContext, centerX: number, top: number, left: boolean) {
  const { height, width } = TRIANGLE
  const tip = left ? centerX - width / 2 : centerX + width / 2
  const base = left ? centerX + width / 2 : centerX - width / 2
  context.beginPath()
  context.moveTo(tip, top + height / 2)
  context.lineTo(base, top)
  context.lineTo(base, top + height)
  context.closePath()
  context.fill()
}

/**
 * Весь стан заново: линия, размер, ноты и паузы, вязки восьмых, тактовые черты, отметки.
 * Движения нет — перерисовка целиком при каждой смене состояния.
 */
export function drawRhythm(host: HTMLElement, geometry: StaffGeometry, view: RhythmView) {
  const context = prepareContext(host, geometry)
  const ink = cssColor('--ink')
  const colors: Record<NoteLook, string> = {
    pending: ink,
    current: cssColor('--note-current'),
    played: ink,
    onTime: cssColor('--note-correct'),
    early: cssColor('--note-wrong'),
    late: cssColor('--note-wrong'),
  }

  const { pattern } = view
  const stave = makeRhythmStave(geometry, pattern.meter)
  context.setLineWidth(LINE_WIDTH)
  context.setStrokeStyle(ink)
  context.setFillStyle(ink)
  stave.setContext(context).draw()

  // Места по времени: восьмая — одна «клетка», между тактами — ещё клетка под черту.
  const barTicks = pattern.meter * TICKS_PER_BEAT
  const barCount = pattern.bars.length
  const noteStart = stave.getNoteStartX() + SPACING
  const available = geometry.virtualWidth - RIGHT_PADDING - noteStart
  const cell = available / cellsOf(pattern)
  const xAt = (tick: number) =>
    noteStart + (tick + Math.floor(tick / barTicks) * BAR_GAP_TICKS) * cell

  const drawn: { note: StaveNote; look: NoteLook | null }[] = []
  const beams: StaveNote[][] = []
  let tick = 0
  let noteIndex = 0
  for (const id of pattern.bars.flat()) {
    const group: StaveNote[] = []
    for (const item of FIGURES[id].items) {
      const look = item.rest ? null : view.looks[noteIndex++]
      const color = look ? colors[look] : ink
      const note = new StaveNote({
        keys: [KEY],
        duration: DURATIONS[item.ticks] + (item.rest ? 'r' : ''),
        stemDirection: 1,
      })
      if (item.ticks === 3) Dot.buildAndAttach([note], { all: true })
      note.setStave(stave)
      note.setStyle({ fillStyle: color, strokeStyle: color })
      new TickContext()
        .addTickable(note)
        .preFormat()
        .setX(xAt(tick) - stave.getNoteStartX())
      drawn.push({ note, look })
      if (item.ticks === 1) group.push(note)
      tick += item.ticks
    }
    // Две восьмые одной фигуры — под одной вязкой, всегда внутри доли.
    if (group.length === 2) beams.push(group)
  }

  const beamObjects = beams.map((group) => new Beam(group))
  for (const { note, look } of drawn) {
    if (look === 'current') context.openGroup('rhythm-current')
    note.setContext(context).draw()
    if (look === 'current') context.closeGroup()
  }
  for (const beam of beamObjects) {
    const color = beam.getNotes()[0].getStyle()?.fillStyle ?? ink
    beam.setStyle({ fillStyle: color, strokeStyle: color })
    beam.setContext(context).draw()
  }

  // Тактовые черты: между тактами и в конце — короткие, поперёк единственной линии.
  context.save()
  context.setFillStyle(ink)
  const lineY = stave.getYForLine(2)
  for (let bar = 1; bar <= barCount; bar++) {
    const x =
      bar === barCount ? geometry.virtualWidth - RIGHT_PADDING / 2 : xAt(bar * barTicks) - cell
    context.fillRect(x - LINE_WIDTH / 2, lineY - 2 * SPACING, LINE_WIDTH, 4 * SPACING)
  }
  context.restore()

  // Отметки: форма дублирует цвет (OB-8, NFR-3).
  for (const { note, look } of drawn) {
    if (!look || look === 'pending') continue
    const headWidth = note.getGlyphWidth()
    const centerX = note.getAbsoluteX() + headWidth / 2
    const headY = note.getYs()[0]
    const color = colors[look]
    if (look === 'current' || look === 'played') {
      context.save()
      context.setFillStyle(color)
      context.fillRect(centerX - headWidth, geometry.staveY + BAR_Y, headWidth * 2, 5)
      context.restore()
      continue
    }
    strokeShape(context, color, look === 'onTime' ? [] : [5, 4], () =>
      context.arc(centerX, headY, SPACING * 1.4, 0, Math.PI * 2, false),
    )
    if (look !== 'onTime') {
      context.save()
      context.setFillStyle(color)
      drawTriangle(context, centerX, geometry.staveY + TRIANGLE.top, look === 'early')
      context.restore()
    }
  }
}
