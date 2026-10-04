// «Что улучшилось» (C-STF-4, OB-11, OB-13, OB-14): сессия против истории до неё.
// Слова строит интерфейс (C-APP-3): здесь только что улучшилось и числа «было → стало».

import { hasProgress, TABLES, type ItemStats, type ModeStats, type StatKind } from './stats'
import { MIN_ATTEMPTS } from './weights'

/** Точность выше на столько (доля) или время меньше на столько (доля) — улучшение (LIM-4). */
export const ACCURACY_GAIN = 0.2
export const TIME_GAIN = 0.2
/** Строк в блоке (LIM-3). */
export const MAX_LINES = 3

/**
 * Одно улучшение: место, что улучшилось и «было → стало». Для «accuracy» числа — доли 0–1,
 * для «speed» — среднее время в миллисекундах.
 */
export interface ImprovementLine {
  kind: StatKind
  key: string
  metric: 'accuracy' | 'speed'
  before: number
  now: number
}

export type Improvements =
  { firstSession: true } | { firstSession: false; lines: ImprovementLine[] }

interface Candidate {
  gain: number
  line: ImprovementLine
}

function compare(kind: StatKind, key: string, before: ItemStats, now: ItemStats) {
  if (before.attempts < MIN_ATTEMPTS || now.attempts < MIN_ATTEMPTS) return null
  const candidates: Candidate[] = []
  const accBefore = before.clean / before.attempts
  const accNow = now.clean / now.attempts
  if (accNow - accBefore >= ACCURACY_GAIN - 1e-9) {
    candidates.push({
      gain: accNow - accBefore,
      line: { kind, key, metric: 'accuracy', before: accBefore, now: accNow },
    })
  }
  if (before.timeCount >= MIN_ATTEMPTS && now.timeCount >= MIN_ATTEMPTS) {
    const gain = 1 - now.avgMs / before.avgMs
    if (gain >= TIME_GAIN - 1e-9) {
      candidates.push({
        gain,
        line: { kind, key, metric: 'speed', before: before.avgMs, now: now.avgMs },
      })
    }
  }
  return candidates.sort((a, b) => b.gain - a.gain)[0] ?? null
}

/**
 * Улучшения сессии (session) против истории до неё (before). Если истории не было —
 * первая сессия; иначе до трёх строк по величине улучшения (пустой список — изменений нет).
 */
export function improvements(before: ModeStats, session: ModeStats): Improvements {
  if (!hasProgress(before)) return { firstSession: true }
  const found: Candidate[] = []
  for (const kind of ['note', 'interval', 'figure', 'task'] as const) {
    const table = TABLES[kind]
    for (const [key, now] of Object.entries(session[table]) as [string, ItemStats][]) {
      const history = (before[table] as Record<string, ItemStats>)[key]
      const best = history && compare(kind, key, history, now)
      if (best) found.push(best)
    }
  }
  found.sort((a, b) => b.gain - a.gain)
  return { firstSession: false, lines: found.slice(0, MAX_LINES).map((c) => c.line) }
}
