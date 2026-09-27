// «Что улучшилось» (C-STF-4, OB-11, OB-13, OB-14): сессия против истории до неё.

import { pitchToNoteName } from '../../midi/noteNames'
import { hasProgress, type ItemStats, type ModeStats } from './stats'
import { MIN_ATTEMPTS } from './weights'

/** Точность выше на столько (доля) или время меньше на столько (доля) — улучшение (LIM-4). */
export const ACCURACY_GAIN = 0.2
export const TIME_GAIN = 0.2
/** Строк в блоке (LIM-3). */
export const MAX_LINES = 3

export type Improvements = { firstSession: true } | { firstSession: false; lines: string[] }

const percent = (share: number) => `${Math.round(share * 100)} %`
const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} с`

/** «C4», «C3 (бас)», «↑3». */
function label(kind: 'note' | 'interval', key: string): string {
  if (kind === 'interval') {
    const up = key.startsWith('up')
    return `${up ? '↑' : '↓'}${key.slice(up ? 2 : 4)}`
  }
  const [clef, pitch] = key.split(':')
  return `${pitchToNoteName(Number(pitch))}${clef === 'bass' ? ' (бас)' : ''}`
}

interface Candidate {
  gain: number
  line: string
}

function compare(kind: 'note' | 'interval', key: string, before: ItemStats, now: ItemStats) {
  if (before.attempts < MIN_ATTEMPTS || now.attempts < MIN_ATTEMPTS) return null
  const candidates: Candidate[] = []
  const accBefore = before.clean / before.attempts
  const accNow = now.clean / now.attempts
  if (accNow - accBefore >= ACCURACY_GAIN - 1e-9) {
    candidates.push({
      gain: accNow - accBefore,
      line: `${label(kind, key)} — точнее: ${percent(accBefore)} → ${percent(accNow)}`,
    })
  }
  if (before.timeCount >= MIN_ATTEMPTS && now.timeCount >= MIN_ATTEMPTS) {
    const gain = 1 - now.avgMs / before.avgMs
    if (gain >= TIME_GAIN - 1e-9) {
      candidates.push({
        gain,
        line: `${label(kind, key)} — быстрее: ${seconds(before.avgMs)} → ${seconds(now.avgMs)}`,
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
  for (const kind of ['note', 'interval'] as const) {
    const table = kind === 'note' ? 'notes' : 'intervals'
    for (const [key, now] of Object.entries(session[table]) as [string, ItemStats][]) {
      const history = (before[table] as Record<string, ItemStats>)[key]
      const best = history && compare(kind, key, history, now)
      if (best) found.push(best)
    }
  }
  found.sort((a, b) => b.gain - a.gain)
  return { firstSession: false, lines: found.slice(0, MAX_LINES).map((c) => c.line) }
}
