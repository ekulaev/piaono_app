// Геометрия клавиатуры: сколько клавиш видно, какой они ширины, где видимая часть.
// Чистая арифметика без DOM — поэтому живёт в engine/ и покрыта тестами.

export const LOWEST_PITCH = 21 // A0
export const HIGHEST_PITCH = 108 // C8
export const MIDDLE_C = 60 // C4

/** Минимальная ширина чёрной клавиши — цель касания из дизайн-конституции (56px). */
export const MIN_BLACK_WIDTH_REM = 3.5
/** У настоящего пианино чёрная клавиша ≈ 0,58 ширины белой (13,7 мм против 23,5 мм). */
export const BLACK_TO_WHITE = 0.58
/** Чёрные клавиши занимают верхние 62 % высоты. */
export const BLACK_HEIGHT_RATIO = 0.62

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

export function isBlackKey(pitch: number): boolean {
  return BLACK_PITCH_CLASSES.has(pitch % 12)
}

/** Высоты всех 52 белых клавиш от A0 до C8 по порядку. */
export const WHITE_PITCHES: readonly number[] = Array.from(
  { length: HIGHEST_PITCH - LOWEST_PITCH + 1 },
  (_, i) => LOWEST_PITCH + i,
).filter((pitch) => !isBlackKey(pitch))

export const WHITE_KEY_COUNT = WHITE_PITCHES.length // 52

export interface KeyboardLayout {
  whiteWidthPx: number
  blackWidthPx: number
  /** Сколько белых клавиш видно целиком (обрезанных клавиш по краям нет). */
  visibleWhiteCount: number
  /** Нужны ли кнопки прокрутки. Их ширина равна ширине белой клавиши. */
  showButtons: boolean
}

/**
 * Раскладка под ширину зоны. Минимум задан для чёрной клавиши, белая выводится из неё
 * по пропорции. Если все 52 белые не помещаются, по краям встают две кнопки шириной
 * в белую клавишу, а белые растягиваются, чтобы ровно заполнить место между ними.
 */
export function computeLayout(zoneWidthPx: number, remPx: number): KeyboardLayout {
  const minWhite = (MIN_BLACK_WIDTH_REM * remPx) / BLACK_TO_WHITE

  if (WHITE_KEY_COUNT * minWhite <= zoneWidthPx) {
    const whiteWidthPx = zoneWidthPx / WHITE_KEY_COUNT
    return {
      whiteWidthPx,
      blackWidthPx: whiteWidthPx * BLACK_TO_WHITE,
      visibleWhiteCount: WHITE_KEY_COUNT,
      showButtons: false,
    }
  }

  // Слотов шириной в белую клавишу: два уходят под кнопки, остальные — клавиши.
  const slots = Math.max(3, Math.floor(zoneWidthPx / minWhite))
  const visibleWhiteCount = Math.min(slots - 2, WHITE_KEY_COUNT)
  const whiteWidthPx = Math.max(minWhite, zoneWidthPx / slots)
  return {
    whiteWidthPx,
    blackWidthPx: whiteWidthPx * BLACK_TO_WHITE,
    visibleWhiteCount,
    showButtons: true,
  }
}

/** Индекс первой видимой белой клавиши держится в допустимых пределах. */
function clampStart(start: number, count: number): number {
  return Math.min(Math.max(0, start), WHITE_KEY_COUNT - count)
}

function centerOffset(count: number): number {
  return Math.floor(count / 2)
}

/** Начальное положение: C4 в центре видимой части. */
export function initialStart(count: number): number {
  return clampStart(WHITE_PITCHES.indexOf(MIDDLE_C) - centerOffset(count), count)
}

/**
 * Центрирование на диапазоне нот (начало последовательности): в центр видимой части встаёт
 * белая клавиша у середины диапазона, у краёв клавиатуры — насколько позволяют края.
 */
export function centerStartOn(low: number, high: number, count: number): number {
  const middle = (low + high) / 2
  const index = WHITE_PITCHES.findIndex((pitch) => pitch >= middle)
  const center = index === -1 ? WHITE_KEY_COUNT - 1 : index
  return clampStart(center - centerOffset(count), count)
}

/** После смены размера центральная клавиша остаётся в центре, насколько позволяют края. */
export function resizeStart(start: number, oldCount: number, newCount: number): number {
  const center = start + centerOffset(oldCount)
  return clampStart(center - centerOffset(newCount), newCount)
}

/** Сдвиг видимой части на delta белых клавиш (отрицательный — к низким нотам). */
export function shiftStart(start: number, delta: number, count: number): number {
  return clampStart(start + delta, count)
}

export type Side = 'left' | 'right'

/** Кнопка заблокирована, когда в видимой части уже есть A0 (левая) или C8 (правая). */
export function isBlocked(side: Side, start: number, count: number): boolean {
  return side === 'left' ? start <= 0 : start + count >= WHITE_KEY_COUNT
}

export interface VisibleRange {
  /** Высота первой видимой белой клавиши. */
  low: number
  /** Высота последней видимой белой клавиши. */
  high: number
}

/**
 * Видимый диапазон. Чёрная клавиша видна, только если видны обе её белые соседки,
 * то есть low < pitch < high; чёрные клавиши у самого края не рисуются.
 */
export function visibleRange(start: number, count: number): VisibleRange {
  return { low: WHITE_PITCHES[start], high: WHITE_PITCHES[start + count - 1] }
}

/**
 * Какая клавиша под точкой (x, y). x отсчитывается от левого края первой видимой белой
 * клавиши, y — от верха зоны. Чёрные клавиши лежат поверх белых в верхней части.
 * Возвращает null, если точка вне клавиш.
 */
export function hitTest(
  x: number,
  y: number,
  heightPx: number,
  layout: KeyboardLayout,
  start: number,
): number | null {
  const { whiteWidthPx, blackWidthPx, visibleWhiteCount } = layout
  if (x < 0 || y < 0 || y > heightPx) return null
  const index = Math.floor(x / whiteWidthPx)
  if (index >= visibleWhiteCount) return null

  const whitePitch = WHITE_PITCHES[start + index]
  if (y <= heightPx * BLACK_HEIGHT_RATIO) {
    const offset = x - index * whiteWidthPx
    const half = blackWidthPx / 2
    // Чёрная слева: лежит на границе с предыдущей видимой белой.
    if (offset < half && index > 0 && isBlackKey(whitePitch - 1)) return whitePitch - 1
    // Чёрная справа: лежит на границе со следующей видимой белой.
    if (
      offset > whiteWidthPx - half &&
      index + 1 < visibleWhiteCount &&
      isBlackKey(whitePitch + 1)
    ) {
      return whitePitch + 1
    }
  }
  return whitePitch
}

/**
 * Подсветка кнопок прокрутки: есть ли удерживаемая нота левее или правее видимой части.
 * Вычисляется на каждой отрисовке и нигде не хранится, поэтому гаснет сама — и когда ноту
 * отпустили, и когда до неё докрутили.
 */
export function scrollHints(
  held: Iterable<number>,
  range: VisibleRange,
): { left: boolean; right: boolean } {
  let left = false
  let right = false
  for (const pitch of held) {
    if (pitch < range.low) left = true
    if (pitch > range.high) right = true
  }
  return { left, right }
}

/**
 * Пауза перед следующим сдвигом при удержании кнопки прокрутки: 0,5 с, затем на 0,1 с
 * меньше за каждую секунду удержания, но не меньше 0,1 с.
 */
export function repeatDelayMs(heldMs: number): number {
  return Math.max(100, 500 - 100 * Math.floor(heldMs / 1000))
}
