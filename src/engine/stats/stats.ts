// Статистика упражнений (C-STF-4): что тренажёр помнит о нотах и интервалах в каждом режиме.
// Хранятся только счётчики и среднее время — объём не растёт с числом сессий.

import type { Direction } from '../sequences/anchors'
import type { Clef } from '../staff/pickNote'

/** Режимы со своей статистикой. */
export type StatsMode = 'sequences' | 'contour' | 'warmup'

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

export interface ModeStats {
  notes: Record<NoteKey, ItemStats>
  intervals: Record<IntervalKey, ItemStats>
}

export type PracticeStats = Record<StatsMode, ModeStats>

export const noteKey = (clef: Clef, pitch: number): NoteKey => `${clef}:${pitch}`
export const intervalKey = (size: number, direction: Direction): IntervalKey =>
  `${direction}${size}`

export const emptyModeStats = (): ModeStats => ({ notes: {}, intervals: {} })
export const emptyPracticeStats = (): PracticeStats => ({
  sequences: emptyModeStats(),
  contour: emptyModeStats(),
  warmup: emptyModeStats(),
})

/**
 * Есть ли у режима хоть одна запись — нота или интервал (для приглашения «Ещё нет прогресса»
 * и «первой сессии»). У «Контура» нот нет, только переходы.
 */
export function hasProgress(stats: ModeStats): boolean {
  return Object.keys(stats.notes).length > 0 || Object.keys(stats.intervals).length > 0
}

export type Outcome = 'clean' | 'error' | 'skip'

/** Одна законченная попытка: нота или интервал, исход, время (null — не учитывается). */
export interface StatEvent {
  kind: 'note' | 'interval'
  key: NoteKey | IntervalKey
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
  const notes = { ...stats.notes }
  const intervals = { ...stats.intervals }
  for (const event of events) {
    const table = (event.kind === 'note' ? notes : intervals) as Record<string, ItemStats>
    table[event.key] = applyEvent(table[event.key] ?? emptyItem(), event)
  }
  return { notes, intervals }
}

/** Статистика одной сессии — для «Что улучшилось». */
export function aggregate(events: readonly StatEvent[]): ModeStats {
  return applyEvents(emptyModeStats(), events)
}

const NOTE_KEY = /^(treble|bass):\d{1,3}$/
/** Интервал вверх или вниз (2–8) либо «на месте» (прима, только в «Контуре»). */
const INTERVAL_KEY = /^((up|down)[2-8]|same1)$/

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
  keyPattern: RegExp,
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
  return notes && intervals ? { notes, intervals } : emptyModeStats()
}

/** Сохранённая статистика обоих режимов; каждый режим читается независимо. */
export function readPracticeStats(value: unknown): PracticeStats {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  return {
    sequences: readModeStats(saved.sequences),
    contour: readModeStats(saved.contour),
    warmup: readModeStats(saved.warmup),
  }
}
