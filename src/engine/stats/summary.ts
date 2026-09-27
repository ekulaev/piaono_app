// Сводка режима для экрана «Прогресс» (C-STF-7): общие числа и трудные места. Трудность — та же,
// по которой тренажёр выбирает места чаще (C-STF-4), поэтому экран показывает ровно их.

import { label } from './improvements'
import { TABLES, type ItemStats, type ModeStats, type StatKind, type StatsMode } from './stats'
import { difficulty, medianAvg, MIN_ATTEMPTS } from './weights'

/** Сколько трудных мест в списке (C-STF-7, LIM-2). */
export const MAX_HARD = 5

/** Основная таблица режима — для общих чисел — и его списки трудных мест (LIM-1). */
const MODE_VIEW: Record<StatsMode, { main: StatKind; lists: { kind: StatKind; title: string }[] }> =
  {
    sequences: {
      main: 'note',
      lists: [
        { kind: 'note', title: 'Трудные ноты' },
        { kind: 'interval', title: 'Трудные интервалы' },
      ],
    },
    contour: { main: 'interval', lists: [{ kind: 'interval', title: 'Трудные переходы' }] },
    rhythm: { main: 'figure', lists: [{ kind: 'figure', title: 'Трудные фигуры' }] },
    warmup: { main: 'note', lists: [{ kind: 'note', title: 'Трудные ноты' }] },
  }

export interface HardPlace {
  label: string
  attempts: number
  /** Доля попыток без ошибки и пропуска, 0–1. */
  cleanShare: number
  /** Среднее время, мс; null — времени нет. */
  avgMs: number | null
}

export interface ModeSummary {
  attempts: number
  cleanShare: number
  /** Среднее время по основной таблице; null — времени нет (у «Ритма» всегда). */
  avgMs: number | null
  lists: { title: string; places: HardPlace[] }[]
}

const tableOf = (stats: ModeStats, kind: StatKind) =>
  Object.entries(stats[TABLES[kind]]) as [string, ItemStats][]

/** Сводка режима; null — у режима нет статистики в основной таблице. */
export function summarizeMode(mode: StatsMode, stats: ModeStats): ModeSummary | null {
  const view = MODE_VIEW[mode]
  const main = tableOf(stats, view.main).map(([, item]) => item)
  const attempts = main.reduce((sum, item) => sum + item.attempts, 0)
  if (attempts === 0) return null
  const clean = main.reduce((sum, item) => sum + item.clean, 0)
  const timeCount = main.reduce((sum, item) => sum + item.timeCount, 0)
  const timeSum = main.reduce((sum, item) => sum + item.avgMs * item.timeCount, 0)
  return {
    attempts,
    cleanShare: clean / attempts,
    avgMs: timeCount === 0 ? null : timeSum / timeCount,
    lists: view.lists.map(({ kind, title }) => ({ title, places: hardPlaces(stats, kind) })),
  }
}

/** До MAX_HARD самых трудных мест: меньше MIN_ATTEMPTS попыток и трудность 0 не попадают. */
function hardPlaces(stats: ModeStats, kind: StatKind): HardPlace[] {
  const entries = tableOf(stats, kind)
  const median = medianAvg(entries.map(([, item]) => item))
  return entries
    .filter(([, item]) => item.attempts >= MIN_ATTEMPTS)
    .map(([key, item]) => ({ key, item, hard: difficulty(item, median), text: label(kind, key) }))
    .filter(({ hard }) => hard > 0)
    .sort(
      (a, b) =>
        b.hard - a.hard ||
        b.item.errors + b.item.skips - (a.item.errors + a.item.skips) ||
        a.text.localeCompare(b.text),
    )
    .slice(0, MAX_HARD)
    .map(({ item, text }) => ({
      label: text,
      attempts: item.attempts,
      cleanShare: item.clean / item.attempts,
      avgMs: item.timeCount > 0 ? item.avgMs : null,
    }))
}
