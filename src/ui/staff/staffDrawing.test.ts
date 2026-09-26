import { describe, expect, it } from 'vitest'
import { HINT_BAND, staffGeometry, TOP_MARGIN } from './staffDrawing'

describe('Геометрия стана', () => {
  it('без полосы — как раньше: стан под местом для двух добавочных линий', () => {
    const geometry = staffGeometry(1000, 240)
    expect(geometry.scale).toBe(2) // 240 px / 120 единиц
    expect(geometry.staveY).toBe(TOP_MARGIN)
    expect(geometry.hintBand).toBe(0)
  })

  it('Полоса подсказок: не больше четверти зоны, стан ниже неё', () => {
    const geometry = staffGeometry(1000, 312, HINT_BAND)
    const bandPx = geometry.hintBand * geometry.scale
    expect(bandPx / geometry.heightPx).toBeLessThanOrEqual(0.25)
    expect(geometry.staveY).toBe(HINT_BAND + TOP_MARGIN)
    expect(geometry.scale).toBe(2)
  })
})
