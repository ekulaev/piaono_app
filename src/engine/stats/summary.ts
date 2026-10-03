// Сводка режима для экрана «Прогресс» (C-STF-7): общие числа и трудные места. Трудность — та же,
// по которой тренажёр выбирает места чаще (C-STF-4), поэтому экран показывает ровно их.

import { pitchToNoteName } from '../../midi/noteNames'
import { intervalLabel } from './labels'
import { TABLES, type ItemStats, type ModeStats, type StatKind, type StatsMode } from './stats'
import { difficulty, medianAvg, MIN_ATTEMPTS } from './weights'

/** Сколько трудных мест в списке (C-STF-7, LIM-2). */
export const MAX_HARD = 5

/**
 * Какой список трудных мест: интерфейс называет его по этому идентификатору (C-APP-3). «Контур»
 * показывает интервалы как «переходы» — поэтому у него свой.
 */
export type HardListId = 'notes' | 'intervals' | 'transitions' | 'figures'

/** Основная таблица режима — для общих чисел — и его списки трудных мест (LIM-1). */
const MODE_VIEW: Record<
  StatsMode,
  { main: StatKind; lists: { id: HardListId; kind: StatKind }[] }
> = {
  sequences: {
    main: 'note',
    lists: [
      { id: 'notes', kind: 'note' },
      { id: 'intervals', kind: 'interval' },
    ],
  },
  contour: { main: 'interval', lists: [{ id: 'transitions', kind: 'interval' }] },
  rhythm: { main: 'figure', lists: [{ id: 'figures', kind: 'figure' }] },
  warmup: { main: 'note', lists: [{ id: 'notes', kind: 'note' }] },
}

export interface HardPlace {
  /** Место: интерфейс подписывает его сам (нота, интервал или фигура — словами на языке). */
  kind: StatKind
  key: string
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
  lists: { id: HardListId; places: HardPlace[] }[]
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
    lists: view.lists.map(({ id, kind }) => ({ id, places: hardPlaces(stats, kind) })),
  }
}

/**
 * Ключ порядка при равной трудности: нота или интервал — как они выглядят на экране («C4», «↑3»),
 * фигура — по идентификатору. От языка не зависит (C-APP-3: порядок одинаков на всех языках).
 */
function sortText(kind: StatKind, key: string): string {
  if (kind === 'figure') return key
  if (kind === 'interval') return intervalLabel(key)
  const [clef, pitch] = key.split(':')
  return `${pitchToNoteName(Number(pitch))}${clef === 'bass' ? ' (bass)' : ''}`
}

/** До MAX_HARD самых трудных мест: меньше MIN_ATTEMPTS попыток и трудность 0 не попадают. */
function hardPlaces(stats: ModeStats, kind: StatKind): HardPlace[] {
  const entries = tableOf(stats, kind)
  const median = medianAvg(entries.map(([, item]) => item))
  return entries
    .filter(([, item]) => item.attempts >= MIN_ATTEMPTS)
    .map(([key, item]) => ({
      key,
      item,
      hard: difficulty(item, median),
      text: sortText(kind, key),
    }))
    .filter(({ hard }) => hard > 0)
    .sort(
      (a, b) =>
        b.hard - a.hard ||
        b.item.errors + b.item.skips - (a.item.errors + a.item.skips) ||
        a.text.localeCompare(b.text),
    )
    .slice(0, MAX_HARD)
    .map(({ key, item }) => ({
      kind,
      key,
      attempts: item.attempts,
      cleanShare: item.clean / item.attempts,
      avgMs: item.timeCount > 0 ? item.avgMs : null,
    }))
}
