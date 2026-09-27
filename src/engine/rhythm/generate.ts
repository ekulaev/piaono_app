// Рисунок «Ритма» (C-STF-6, OB-3, OB-4): такты, заполненные ровно фигурами уровня.

import { weightedPick } from '../stats/weights'
import {
  FIGURES,
  figureTicks,
  LEVELS,
  TICKS_PER_BEAT,
  type FigureId,
  type RhythmLevel,
} from './figures'

export type Meter = 3 | 4

/** Нота рисунка, по которой ученик ударяет. Паузы в этот список не входят. */
export interface RhythmNote {
  /** Начало от начала рисунка, в тиках (восьмых). */
  at: number
  ticks: number
  /** Номер фигуры в рисунке (сквозной по тактам) — для статистики фигур. */
  figure: number
}

export interface Pattern {
  meter: Meter
  /** Фигуры по тактам. */
  bars: FigureId[][]
  /** Ноты по порядку игры. */
  notes: RhythmNote[]
}

/** Меньше 3 нот оценивать нечего: 2 удара лишь задают темп (LIM-7). */
export const MIN_NOTES = 3
const MAX_TRIES = 20

/** Фигуры рисунка подряд, сквозь такты. */
export const patternFigures = (pattern: Pattern): FigureId[] => pattern.bars.flat()

/** Ноты рисунка с их местами. */
export function notesOf(bars: readonly FigureId[][]): RhythmNote[] {
  const notes: RhythmNote[] = []
  let at = 0
  bars.flat().forEach((id, figure) => {
    for (const item of FIGURES[id].items) {
      if (!item.rest) notes.push({ at, ticks: item.ticks, figure })
      at += item.ticks
    }
  })
  return notes
}

function buildBars(
  level: RhythmLevel,
  meter: Meter,
  barCount: number,
  weight: (id: FigureId) => number,
  random: () => number,
): FigureId[][] {
  const bars: FigureId[][] = []
  for (let bar = 0; bar < barCount; bar++) {
    const figures: FigureId[] = []
    let left = meter * TICKS_PER_BEAT
    while (left > 0) {
      const first = bar === 0 && figures.length === 0
      const fitting = LEVELS[level].filter(
        // Первая доля рисунка — нота: иначе ученику не с чего начать отсчёт.
        (id) => figureTicks(id) <= left && !(first && FIGURES[id].items[0].rest),
      )
      const id = weightedPick(fitting, weight, random)
      figures.push(id)
      left -= figureTicks(id)
    }
    bars.push(figures)
  }
  return bars
}

/**
 * Случайный рисунок. Трудные фигуры выпадают чаще (weight — вес фигуры по статистике).
 * Если нот меньше MIN_NOTES, рисунок строится заново; на крайний случай — такты из четвертей
 * (четверть есть на каждом уровне, а в 3/4 это уже 3 ноты).
 */
export function generatePattern(
  level: RhythmLevel,
  meter: Meter,
  barCount: number,
  weight: (id: FigureId) => number,
  random: () => number,
): Pattern {
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const bars = buildBars(level, meter, barCount, weight, random)
    const notes = notesOf(bars)
    if (notes.length >= MIN_NOTES) return { meter, bars, notes }
  }
  const bars = Array.from({ length: barCount }, () => Array<FigureId>(meter).fill('quarter'))
  return { meter, bars, notes: notesOf(bars) }
}

/** Рисунки сессии по настройкам. «Повторить» переиспользует этот же массив. */
export function buildRhythmSession(
  settings: { level: RhythmLevel; meter: Meter; bars: number; patterns: number },
  random: () => number,
  weight: (id: FigureId) => number,
): Pattern[] {
  return Array.from({ length: settings.patterns }, () =>
    generatePattern(settings.level, settings.meter, settings.bars, weight, random),
  )
}
