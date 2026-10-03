// Предпросмотр диапазона «Разминки» (C-STF-9, OB-9…OB-11): на стане нарисованы все ноты
// допустимого диапазона ключа подряд слева направо; выбранный диапазон — подложка и
// заполненные головки акцентного цвета, остальные — пустые контурные. Форма и цвет вместе.

import { StaveNote, TickContext } from 'vexflow/bravura'
import type { Clef } from '../../engine/staff/pickNote'
import type { Tonality } from '../../engine/warmup/keys'
import type { StepRange } from '../../engine/warmup/settings'
import {
  LEDGER_WIDTH,
  LINE_WIDTH,
  cssColor,
  makeStave,
  prepareContext,
  vexKeyOfStep,
  type StaffGeometry,
} from '../staff/staffDrawing'

export interface PreviewSpec {
  clef: Clef
  tonality: Tonality
  /** Все ноты, которые можно выбрать (допустимый диапазон ключа). */
  limits: StepRange
  /** Выбранный диапазон. */
  range: StepRange
}

/** Запас между нотами и краем свободной части зоны, условные единицы. */
const EDGE_GAP = 6

/**
 * Рисует стан предпросмотра. rightLimitX — правая граница свободной части зоны (условные
 * единицы от левого края стана): правее неё нот нет, там меню.
 */
export function drawPreview(
  host: HTMLElement,
  geometry: StaffGeometry,
  spec: PreviewSpec,
  rightLimitX: number,
) {
  const context = prepareContext(host, geometry)
  const ink = cssColor('--ink')
  const accent = cssColor('--note-current')
  const stave = makeStave(geometry, spec.clef, spec.tonality.signature)
  const count = spec.limits.high - spec.limits.low + 1

  // Головка ноты — одна и та же, чтобы положения совпадали: размер берём у настоящей ноты.
  const probe = new StaveNote({
    keys: [vexKeyOfStep(spec.limits.low)],
    duration: 'w',
    clef: spec.clef,
  })
  const headWidth = probe.getGlyphWidth()
  const left = stave.getNoteStartX() + EDGE_GAP + headWidth / 2
  const right = Math.max(left, rightLimitX - EDGE_GAP - headWidth / 2)
  const slot = count > 1 ? (right - left) / (count - 1) : 0
  const centerOf = (step: number) => left + (step - spec.limits.low) * slot

  // Подложка выбранного диапазона на всю высоту зоны: видно сразу, где он начинается и кончается.
  const bandLeft = centerOf(spec.range.low) - slot / 2
  const bandRight = centerOf(spec.range.high) + slot / 2
  context.save()
  context.setFillStyle(cssColor('--accent-tint'))
  context.setStrokeStyle(accent)
  context.setLineWidth(LINE_WIDTH)
  context.beginPath()
  context.rect(bandLeft, 0, bandRight - bandLeft, geometry.heightPx / geometry.scale)
  context.fill()
  context.stroke()
  context.restore()

  // Линии стана, ключ и знаки при ключе.
  context.setLineWidth(LINE_WIDTH)
  context.setStrokeStyle(ink)
  context.setFillStyle(ink)
  stave.setContext(context).draw()

  for (let step = spec.limits.low; step <= spec.limits.high; step++) {
    const selected = step >= spec.range.low && step <= spec.range.high
    const color = selected ? accent : ink
    // Выбранная — четвертная (залитая) без штиля, остальные — целые (пустые): различимы без цвета.
    const note = new StaveNote({
      keys: [vexKeyOfStep(step)],
      duration: selected ? 'q' : 'w',
      clef: spec.clef,
    })
    note.setStave(stave)
    note.setStyle({ fillStyle: color, strokeStyle: color })
    // Штиль не нужен: нота — только отметка положения (после setStyle, который красит и штиль).
    note.setStemStyle({ strokeStyle: 'transparent', fillStyle: 'transparent' })
    note.setLedgerLineStyle({ strokeStyle: color, lineWidth: LEDGER_WIDTH })
    // VexFlow считает x от начала нот стана: узнаём этот сдвиг при x = 0 и вычитаем его.
    const tick = new TickContext().addTickable(note).preFormat().setX(0)
    tick.setX(centerOf(step) - note.getGlyphWidth() / 2 - note.getAbsoluteX())
    note.setContext(context).draw()
  }
}
