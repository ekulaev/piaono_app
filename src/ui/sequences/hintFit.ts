// Размер подсказок над станом последовательности: в плотной последовательности подсказка
// исходного размера шире расстояния между нотами, и соседние подсказки налезают друг на друга.

/** Кегль подсказок в исходном размере, условные единицы стана. */
export const HINT_FONT_SIZE = 30
/** Стрелка подсказки интервала в исходном размере. */
export const ARROW = { height: 21, headHeight: 9, headWidth: 13, stemWidth: 4, gap: 4 }
/** Зазор между соседними подсказками. */
export const MIN_HINT_GAP = 6
/** Сильнее уменьшать нельзя: цифра становится ниже 1,3 промежутка стана и плохо читается. */
export const MIN_HINT_SCALE = 0.6

/** Ширина подсказки интервала в исходном размере: стрелка, зазор и цифра замеренной ширины. */
export function intervalHintWidth(digitWidth: number): number {
  return ARROW.headWidth + ARROW.gap + digitWidth
}

/**
 * Во сколько раз уменьшить подсказку, чтобы она поместилась между соседними позициями:
 * её ширина не больше расстояния между центрами позиций минус зазор. От 0,6 до 1.
 */
export function fitHintScale(positionGap: number, naturalWidth: number): number {
  const fit = (positionGap - MIN_HINT_GAP) / naturalWidth
  return Math.min(1, Math.max(MIN_HINT_SCALE, fit))
}
