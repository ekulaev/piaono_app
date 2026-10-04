// Статистика упражнений (C-STF-4): что тренажёр помнит о нотах, интервалах, ритмических
// фигурах (C-STF-6) и типах заданий сольфеджио (C-SOL-1) в каждом режиме.
// Хранятся только счётчики и среднее время — объём не растёт с числом сессий.

import { isFigureId, type FigureId } from '../rhythm/figures'
import { isIntervalTaskType } from '../solfege/intervals/intervals'
import { isDurationTaskType } from '../solfege/durations/durations'
import type { Direction } from '../sequences/anchors'
import type { Clef } from '../staff/pickNote'

/** Режимы со своей статистикой. */
export type StatsMode = 'sequences' | 'contour' | 'rhythm' | 'warmup' | 'intervals' | 'durations'

export interface ItemStats {
  /** Все законченные попытки. */
  attempts: number
  /** Верно с первой попытки. */
  clean: number
  /** Верно после ошибки. */
  errors: number
  /** «Пропустить» или «не успел» — хранится отдельно от ошибок. */
  skips: number
  /** Сколько времён реакции учтено в среднем. */
  timeCount: number
  /** Среднее время реакции, мс. */
  avgMs: number
}

/** Нота вместе с ключом: C4 в скрипичном и в басовом читаются по-разному. */
export type NoteKey = `${Clef}:${number}`
/** Интервал: направление и размер, например 'up3'. */
export type IntervalKey = `${Direction}${number}`
/** Ритмическая фигура «Ритма», например 'eighths'. */
export type FigureKey = FigureId
/** Тип задания режима сольфеджио, например 'name:down:TT' (C-SOL-1, OB-16). */
export type TaskKey = string

export interface ModeStats {
  notes: Record<NoteKey, ItemStats>
  intervals: Record<IntervalKey, ItemStats>
  /** Только у «Ритма»; у остальных режимов пусто. */
  figures: Partial<Record<FigureKey, ItemStats>>
  /** Только у режимов сольфеджио; у остальных режимов пусто. */
  tasks: Record<TaskKey, ItemStats>
}

export type PracticeStats = Record<StatsMode, ModeStats>

export const noteKey = (clef: Clef, pitch: number): NoteKey => `${clef}:${pitch}`
export const intervalKey = (size: number, direction: Direction): IntervalKey =>
  `${direction}${size}`

export const emptyModeStats = (): ModeStats => ({
  notes: {},
  intervals: {},
  figures: {},
  tasks: {},
})
export const emptyPracticeStats = (): PracticeStats => ({
  sequences: emptyModeStats(),
  contour: emptyModeStats(),
  rhythm: emptyModeStats(),
  warmup: emptyModeStats(),
  intervals: emptyModeStats(),
  durations: emptyModeStats(),
})

/**
 * Есть ли у режима хоть одна запись — нота, интервал, фигура или задание (для приглашения «Ещё нет
 * прогресса» и «первой сессии»). У «Контура» нот нет, только переходы; у «Ритма» — только фигуры;
 * у режимов сольфеджио — только задания.
 */
export function hasProgress(stats: ModeStats): boolean {
  return (
    Object.keys(stats.notes).length > 0 ||
    Object.keys(stats.intervals).length > 0 ||
    Object.keys(stats.figures).length > 0 ||
    Object.keys(stats.tasks).length > 0
  )
}

export type Outcome = 'clean' | 'error' | 'skip'

export type StatKind = 'note' | 'interval' | 'figure' | 'task'

/** Одна законченная попытка: нота, интервал, фигура или задание, исход, время (null — не учитывается). */
export interface StatEvent {
  kind: StatKind
  key: NoteKey | IntervalKey | FigureKey | TaskKey
  outcome: Outcome
  ms: number | null
}

/**
 * Окно среднего: первые 20 времён дают точное среднее, дальше каждое новое весит 1/20 —
 * свежие попытки важнее старых, а хранить историю не нужно.
 */
export const AVERAGE_WINDOW = 20

const emptyItem = (): ItemStats => ({
  attempts: 0,
  clean: 0,
  errors: 0,
  skips: 0,
  timeCount: 0,
  avgMs: 0,
})

function applyEvent(item: ItemStats, event: StatEvent): ItemStats {
  const next = { ...item, attempts: item.attempts + 1 }
  if (event.outcome === 'clean') next.clean++
  if (event.outcome === 'error') next.errors++
  if (event.outcome === 'skip') next.skips++
  if (event.ms !== null) {
    next.timeCount = item.timeCount + 1
    next.avgMs = item.avgMs + (event.ms - item.avgMs) / Math.min(next.timeCount, AVERAGE_WINDOW)
  }
  return next
}

/** Статистика после событий. Исходная не меняется. */
export function applyEvents(stats: ModeStats, events: readonly StatEvent[]): ModeStats {
  if (events.length === 0) return stats
  const next: ModeStats = {
    notes: { ...stats.notes },
    intervals: { ...stats.intervals },
    figures: { ...stats.figures },
    tasks: { ...stats.tasks },
  }
  for (const event of events) {
    const table = next[TABLES[event.kind]] as Record<string, ItemStats>
    table[event.key] = applyEvent(table[event.key] ?? emptyItem(), event)
  }
  return next
}

/** В какой таблице хранится место каждого вида. */
export const TABLES = {
  note: 'notes',
  interval: 'intervals',
  figure: 'figures',
  task: 'tasks',
} as const

/** Статистика одной сессии — для «Что улучшилось». */
export function aggregate(events: readonly StatEvent[]): ModeStats {
  return applyEvents(emptyModeStats(), events)
}

const NOTE_KEY = /^(treble|bass):\d{1,3}$/
/** Интервал вверх или вниз (2–8) либо «на месте» (прима, только в «Контуре»). */
const INTERVAL_KEY = /^((up|down)[2-8]|same1)$/
const FIGURE_KEY = { test: isFigureId }
/**
 * Типы заданий сольфеджио: «Интервалы» (C-SOL-2, OB-12) и «Длительности» (C-SOL-3, OB-12).
 * Ключи режимов не пересекаются («play:up:m3» и «rest:h»), поэтому проверка одна на все режимы.
 */
const TASK_KEY = { test: (key: string) => isIntervalTaskType(key) || isDurationTaskType(key) }

function readItem(value: unknown): ItemStats | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  const counts = ['attempts', 'clean', 'errors', 'skips', 'timeCount'] as const
  if (!counts.every((name) => Number.isInteger(v[name]) && (v[name] as number) >= 0)) return null
  if (typeof v.avgMs !== 'number' || !Number.isFinite(v.avgMs) || v.avgMs < 0) return null
  const item = v as unknown as ItemStats
  if (item.clean + item.errors + item.skips !== item.attempts) return null
  return {
    attempts: item.attempts,
    clean: item.clean,
    errors: item.errors,
    skips: item.skips,
    timeCount: item.timeCount,
    avgMs: item.avgMs,
  }
}

function readTable<K extends string>(
  value: unknown,
  keyPattern: { test(key: string): boolean },
): Record<K, ItemStats> | null {
  if (typeof value !== 'object' || value === null) return null
  const table = {} as Record<K, ItemStats>
  for (const [key, raw] of Object.entries(value)) {
    const item = readItem(raw)
    if (!keyPattern.test(key) || !item) return null
    table[key as K] = item
  }
  return table
}

/** Статистика режима с устройства: повреждённый режим — пустой, без ошибки. */
function readModeStats(value: unknown): ModeStats {
  if (typeof value !== 'object' || value === null) return emptyModeStats()
  const v = value as Record<string, unknown>
  const notes = readTable<NoteKey>(v.notes, NOTE_KEY)
  const intervals = readTable<IntervalKey>(v.intervals ?? {}, INTERVAL_KEY)
  // Записи до «Ритма» таблицы фигур не имеют — она пустая.
  const figures = readTable<FigureKey>(v.figures ?? {}, FIGURE_KEY)
  // Записи до сольфеджио таблицы заданий не имеют — она пустая.
  const tasks = readTable<TaskKey>(v.tasks ?? {}, TASK_KEY)
  return notes && intervals && figures && tasks
    ? { notes, intervals, figures, tasks }
    : emptyModeStats()
}

/** Сохранённая статистика всех режимов; каждый режим читается независимо. */
export function readPracticeStats(value: unknown): PracticeStats {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return {
    sequences: readModeStats(saved.sequences),
    contour: readModeStats(saved.contour),
    rhythm: readModeStats(saved.rhythm),
    warmup: readModeStats(saved.warmup),
    intervals: readModeStats(saved.intervals),
    durations: readModeStats(saved.durations),
  }
}
