import { describe, expect, it } from 'vitest'
import {
  BLACK_HEIGHT_RATIO,
  computeLayout,
  hitTest,
  initialStart,
  isBlocked,
  repeatDelayMs,
  resizeStart,
  scrollHints,
  shiftStart,
  visibleRange,
  WHITE_KEY_COUNT,
  WHITE_PITCHES,
} from './layout'

const REM = 16
const A0 = 21
const C2 = 36
const C4 = 60
const B4 = 71
const C7 = 96
const C8 = 108

describe('Размеры клавиш', () => {
  it('52 белые клавиши от A0 до C8', () => {
    expect(WHITE_KEY_COUNT).toBe(52)
    expect(WHITE_PITCHES[0]).toBe(A0)
    expect(WHITE_PITCHES[51]).toBe(C8)
  })

  it('Планшет в ландшафте: 1280px — часть клавиш, кнопки есть, чёрная ≥ 56px', () => {
    const layout = computeLayout(1280, REM)
    expect(layout.showButtons).toBe(true)
    expect(layout.blackWidthPx).toBeGreaterThanOrEqual(56)
    expect(layout.visibleWhiteCount).toBe(11)
    // клавиши и две кнопки ровно заполняют ширину
    expect(layout.whiteWidthPx * (layout.visibleWhiteCount + 2)).toBeCloseTo(1280)
  })

  it('Очень широкий экран: все 88 клавиш без кнопок', () => {
    const layout = computeLayout(5200, REM)
    expect(layout.showButtons).toBe(false)
    expect(layout.visibleWhiteCount).toBe(52)
    expect(layout.whiteWidthPx * 52).toBeCloseTo(5200)
    expect(layout.blackWidthPx).toBeGreaterThanOrEqual(56)
  })

  it('Увеличенный системный шрифт: клавиши шире, видно меньше', () => {
    const normal = computeLayout(1280, REM)
    const large = computeLayout(1280, REM * 1.5)
    expect(large.whiteWidthPx).toBeGreaterThan(normal.whiteWidthPx)
    expect(large.visibleWhiteCount).toBeLessThan(normal.visibleWhiteCount)
  })

  it('узкий экран: хотя бы одна клавиша и две кнопки', () => {
    const layout = computeLayout(200, REM)
    expect(layout.visibleWhiteCount).toBe(1)
    expect(layout.showButtons).toBe(true)
  })
})

describe('Начальное положение и смена размера', () => {
  it('Запуск: C4 в центре видимой части', () => {
    for (const count of [5, 11, 13, 20]) {
      const start = initialStart(count)
      expect(WHITE_PITCHES[start + Math.floor(count / 2)]).toBe(C4)
    }
  })

  it('Изменение размера окна: центральная клавиша остаётся в центре', () => {
    const start = initialStart(13)
    const center = WHITE_PITCHES[start + 6]
    const narrowed = resizeStart(start, 13, 9)
    expect(WHITE_PITCHES[narrowed + 4]).toBe(center)
  })

  it('Изменение размера у края: A0 остаётся первой видимой', () => {
    expect(resizeStart(0, 9, 13)).toBe(0)
    expect(WHITE_PITCHES[resizeStart(0, 9, 13)]).toBe(A0)
  })

  it('у правого края видимая часть прижимается к C8', () => {
    const count = 11
    const start = WHITE_KEY_COUNT - 9
    const widened = resizeStart(start, 9, count)
    expect(widened + count).toBe(WHITE_KEY_COUNT)
  })
})

describe('Кнопки прокрутки', () => {
  it('Короткое касание: сдвиг ровно на одну белую клавишу', () => {
    expect(shiftStart(20, 1, 11)).toBe(21)
    expect(shiftStart(20, -1, 11)).toBe(19)
  })

  it('Упор в край: дальше A0 и C8 не сдвигается, кнопка заблокирована', () => {
    expect(shiftStart(0, -1, 11)).toBe(0)
    expect(isBlocked('left', 0, 11)).toBe(true)
    expect(isBlocked('left', 1, 11)).toBe(false)
    expect(shiftStart(41, 1, 11)).toBe(41)
    expect(isBlocked('right', 41, 11)).toBe(true)
    expect(isBlocked('right', 40, 11)).toBe(false)
  })

  it('Удержание: пауза 500, 400, 300, 200, 100, 100 мс по секундам удержания', () => {
    expect([0, 1000, 2000, 3000, 4000, 5000].map(repeatDelayMs)).toEqual([
      500, 400, 300, 200, 100, 100,
    ])
    expect(repeatDelayMs(999)).toBe(500)
  })
})

describe('hitTest', () => {
  const layout = computeLayout(1280, REM)
  const w = layout.whiteWidthPx
  const height = 200
  const top = 10
  const bottom = height - 10
  // видимая часть начинается с C4: C D E F G A B C D E F
  const start = WHITE_PITCHES.indexOf(C4)

  it('низ белой клавиши → белая', () => {
    expect(hitTest(w * 0.5, bottom, height, layout, start)).toBe(C4)
    expect(hitTest(w * 1.5, bottom, height, layout, start)).toBe(62)
  })

  it('верх чёрной клавиши → чёрная, под ней ниже её края → белая', () => {
    expect(hitTest(w * 1, top, height, layout, start)).toBe(61) // C#4 на границе C–D
    expect(hitTest(w * 1, height * BLACK_HEIGHT_RATIO + 5, height, layout, start)).toBe(62)
  })

  it('граница E–F без чёрной клавиши', () => {
    expect(hitTest(w * 3 - 1, top, height, layout, start)).toBe(64)
    expect(hitTest(w * 3 + 1, top, height, layout, start)).toBe(65)
  })

  it('обрезанная чёрная у левого края не попадает', () => {
    const fromD4 = WHITE_PITCHES.indexOf(62)
    expect(hitTest(1, top, height, layout, fromD4)).toBe(62) // C#4 не видна
  })

  it('вне клавиш → null', () => {
    expect(hitTest(-1, top, height, layout, start)).toBeNull()
    expect(hitTest(w * layout.visibleWhiteCount + 1, top, height, layout, start)).toBeNull()
    expect(hitTest(10, height + 1, height, layout, start)).toBeNull()
  })
})

describe('Подсветка кнопок прокрутки', () => {
  const octave = { low: C4, high: B4 }

  it('Одна скрытая клавиша: C2 → левая', () => {
    expect(scrollHints([C2], octave)).toEqual({ left: true, right: false })
  })

  it('Скрытые клавиши с двух сторон: C2 и C7 → обе', () => {
    expect(scrollHints([C2, C7], octave)).toEqual({ left: true, right: true })
  })

  it('Отпускание скрытой клавиши: нет удерживаемых — нет подсветки', () => {
    expect(scrollHints([], octave)).toEqual({ left: false, right: false })
  })

  it('Прокрутка к скрытой клавише: C2 стала видна — подсветки нет', () => {
    const range = visibleRange(WHITE_PITCHES.indexOf(C2), 7)
    expect(scrollHints([C2], range)).toEqual({ left: false, right: false })
  })

  it('Нота вне диапазона: ниже A0 даёт левую даже у края', () => {
    const range = visibleRange(0, 11)
    expect(scrollHints([10], range)).toEqual({ left: true, right: false })
  })

  it('Клавиатура видна целиком: нота выше C8 не видна ни на одной кнопке-клавише', () => {
    // кнопок нет, UI их не рисует; функция лишь сообщает направление
    const range = visibleRange(0, WHITE_KEY_COUNT)
    expect(scrollHints([120], range)).toEqual({ left: false, right: true })
  })

  it('чёрная клавиша у края считается скрытой', () => {
    const fromD4 = visibleRange(WHITE_PITCHES.indexOf(62), 7)
    expect(scrollHints([61], fromD4)).toEqual({ left: true, right: false })
  })
})
