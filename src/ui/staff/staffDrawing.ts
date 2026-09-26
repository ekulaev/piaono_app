// Всё, что знает про VexFlow: как нарисовать стан, ключ и ноту. React здесь нет.
// Координаты VexFlow — «условные единицы»: 10 единиц между линиями стана.
// Под размер зоны всё масштабируется одним коэффициентом (scale).

import { Renderer, Stave, StaveNote, TickContext, type RenderContext } from 'vexflow/bravura'
import type { Clef, StaffNote } from '../../engine/staff/pickNote'

export const SPACING = 10 // между линиями стана, условные единицы
/** Над станом: две добавочные линии, головка ноты над второй и поле. */
export const TOP_MARGIN = 40
/** Высота по вертикали: 4 промежутка стана + по 3 сверху и снизу + поля. */
const VIRTUAL_HEIGHT = TOP_MARGIN * 2 + 4 * SPACING
/** Линии стана и добавочные линии — вдвое толще, чем у VexFlow по умолчанию. */
export const LINE_WIDTH = 2
export const LEDGER_WIDTH = 3
/**
 * Полоса подсказок интервалов над станом (C-STF-3): 36 из 156 единиц высоты — меньше
 * четверти зоны. Цифра подсказки высотой около двух промежутков стана помещается в неё.
 */
export const HINT_BAND = 36
/** Отступ ноты от правого края стана в начале пути. */
const RIGHT_PADDING = 12

export type NoteLook = 'normal' | 'correct' | 'wrong'

export interface StaffGeometry {
  /** Ширина и высота стана на экране, px. */
  widthPx: number
  heightPx: number
  scale: number
  /** Ширина стана в условных единицах. */
  virtualWidth: number
  /** Высота полосы подсказок над станом, условные единицы; 0 — полосы нет. */
  hintBand: number
  /** Где верхняя линия стана, условные единицы: под полосой и местом для добавочных линий. */
  staveY: number
}

/**
 * Размер стана под зону: 90 % ширины, вся высота (C-STF-1, OB-1). Если есть полоса подсказок,
 * она занимает верх зоны, а стан с добавочными линиями — остальную высоту (C-STF-3, OB-10).
 */
export function staffGeometry(
  zoneWidthPx: number,
  zoneHeightPx: number,
  hintBand = 0,
): StaffGeometry {
  const widthPx = zoneWidthPx * 0.9
  const heightPx = zoneHeightPx
  const scale = heightPx / (hintBand + VIRTUAL_HEIGHT)
  return {
    widthPx,
    heightPx,
    scale,
    virtualWidth: widthPx / scale,
    hintBand,
    staveY: hintBand + TOP_MARGIN,
  }
}

/** Цвета берутся из CSS-переменных, чтобы палитра жила в одном месте (index.css). */
export function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function makeStave(geometry: StaffGeometry, clef: Clef | null): Stave {
  const stave = new Stave(0, geometry.staveY, geometry.virtualWidth, {
    leftBar: false, // тактовых черт в упражнении нет
    rightBar: false,
    spaceAboveStaffLn: 0,
  })
  if (clef) stave.addClef(clef)
  return stave
}

export function prepareContext(host: HTMLElement, geometry: StaffGeometry): RenderContext {
  host.replaceChildren()
  const renderer = new Renderer(host as HTMLDivElement, Renderer.Backends.SVG)
  renderer.resize(geometry.widthPx, geometry.heightPx)
  const context = renderer.getContext()
  context.scale(geometry.scale, geometry.scale)
  return context
}

/** Слой стана: пять толстых линий и ключ, если на стане есть нота. */
export function drawStaff(host: HTMLElement, geometry: StaffGeometry, clef: Clef | null) {
  const context = prepareContext(host, geometry)
  const ink = cssColor('--ink')
  const stave = makeStave(geometry, clef)
  // Толщину линий берёт контекст отрисовки: стиль стана VexFlow её не применяет.
  context.setLineWidth(LINE_WIDTH)
  context.setStrokeStyle(ink)
  context.setFillStyle(ink)
  stave.setContext(context).draw()
}

/** Путь ноты по горизонтали, условные единицы: от правого края до правой границы ключа. */
export function notePath(geometry: StaffGeometry, clef: Clef, headWidth: number) {
  const stave = makeStave(geometry, clef)
  return {
    startX: geometry.virtualWidth - RIGHT_PADDING - headWidth,
    endX: stave.getNoteStartX(),
  }
}

/** Имя ноты для VexFlow: 64 → "e/4". Упражнение даёт только белые клавиши. */
export function vexKey(pitch: number): string {
  const names = ['c', 'c', 'd', 'd', 'e', 'f', 'f', 'g', 'g', 'a', 'a', 'b']
  return `${names[pitch % 12]}/${Math.floor(pitch / 12) - 1}`
}

export interface DrawnNote {
  /** Где VexFlow нарисовала ноту, условные единицы. */
  drawnX: number
  headWidth: number
}

/**
 * Слой ноты: целая нота с добавочными линиями и, для результата, кольцо вокруг головки
 * (сплошное — верно, пунктирное — неверно). Стан в этом слое не рисуется: он нужен VexFlow
 * только чтобы вычислить высоту ноты и добавочные линии.
 */
export function drawNote(
  host: HTMLElement,
  geometry: StaffGeometry,
  note: StaffNote,
  look: NoteLook,
): DrawnNote {
  const context = prepareContext(host, geometry)
  const color =
    look === 'correct'
      ? cssColor('--note-correct')
      : look === 'wrong'
        ? cssColor('--note-wrong')
        : cssColor('--ink')

  const stave = makeStave(geometry, null)
  const staveNote = new StaveNote({ keys: [vexKey(note.pitch)], duration: 'w', clef: note.clef })
  staveNote.setStave(stave)
  staveNote.setStyle({ fillStyle: color, strokeStyle: color })
  staveNote.setLedgerLineStyle({ strokeStyle: color, lineWidth: LEDGER_WIDTH })
  new TickContext().addTickable(staveNote).preFormat().setX(0)
  staveNote.setContext(context).draw()

  const box = staveNote.getBoundingBox()
  const headWidth = staveNote.getGlyphWidth()
  if (look !== 'normal') {
    const radius = SPACING * 1.6
    context.save()
    context.setStrokeStyle(color)
    context.setLineWidth(3)
    context.setLineDash(look === 'wrong' ? [5, 4] : [])
    context.beginPath()
    context.arc(
      box.getX() + box.getW() / 2,
      box.getY() + box.getH() / 2,
      radius,
      0,
      Math.PI * 2,
      false,
    )
    context.stroke()
    context.restore()
  }
  return { drawnX: staveNote.getAbsoluteX(), headWidth }
}
