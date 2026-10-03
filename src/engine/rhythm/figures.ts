// Ритмические фигуры и уровни «Ритма» (C-STF-6, LIM-1). Фигура — кусок рисунка длиной в целое
// число долей: из фигур собирается такт, по фигурам копится статистика.

/** Одна восьмая. Доля (четверть) — 2 тика. */
export const TICKS_PER_BEAT = 2

export type FigureId = 'half' | 'quarter' | 'eighths' | 'quarter-rest' | 'half-rest' | 'dotted'

/** Нота или пауза внутри фигуры. */
export interface FigureItem {
  ticks: number
  rest: boolean
}

export interface Figure {
  id: FigureId
  items: readonly FigureItem[]
}

const note = (ticks: number): FigureItem => ({ ticks, rest: false })
const rest = (ticks: number): FigureItem => ({ ticks, rest: true })

// Названия фигур для экрана — словами и в файлах перевода (`figure.<id>`): нотных знаков может
// не быть в шрифте интерфейса.
export const FIGURES: Record<FigureId, Figure> = {
  half: { id: 'half', items: [note(4)] },
  quarter: { id: 'quarter', items: [note(2)] },
  eighths: { id: 'eighths', items: [note(1), note(1)] },
  'quarter-rest': { id: 'quarter-rest', items: [rest(2)] },
  'half-rest': { id: 'half-rest', items: [rest(4)] },
  dotted: { id: 'dotted', items: [note(3), note(1)] },
}

export type RhythmLevel = 1 | 2 | 3 | 4

/** Каждый уровень добавляет фигуры к предыдущему (LIM-1). */
export const LEVELS: Record<RhythmLevel, readonly FigureId[]> = {
  1: ['half', 'quarter'],
  2: ['half', 'quarter', 'eighths'],
  3: ['half', 'quarter', 'eighths', 'quarter-rest', 'half-rest'],
  4: ['half', 'quarter', 'eighths', 'quarter-rest', 'half-rest', 'dotted'],
}

/** Длина фигуры в тиках. */
export const figureTicks = (id: FigureId) =>
  FIGURES[id].items.reduce((sum, item) => sum + item.ticks, 0)

/** Пауза ли фигура целиком: ударов в ней нет, и в статистику она не попадает. */
export const isRestFigure = (id: FigureId) => FIGURES[id].items.every((item) => item.rest)

export function isFigureId(value: string): value is FigureId {
  return Object.hasOwn(FIGURES, value)
}
