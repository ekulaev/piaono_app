// Из результатов упражнения — события статистики (C-STF-4, OB-2, OB-3, OB-4).

import { intervalBetween } from '../sequences/anchors'
import type { Sequence } from '../sequences/generate'
import type { Clef } from '../staff/pickNote'
import { intervalKey, noteKey, type Outcome, type StatEvent } from './stats'

/** Минимум из записи шага «Последовательностей», нужный статистике. */
interface StepOutcome {
  result: 'pending' | 'correct' | 'skipped'
  hadError: boolean
  reactionMs: number | null
  hinted: boolean
}

function stepOutcome(record: StepOutcome): Outcome | null {
  if (record.result === 'skipped') return 'skip'
  if (record.result === 'correct') return record.hadError ? 'error' : 'clean'
  return null
}

/**
 * События завершённой последовательности: каждая нота каждого шага (у аккорда — все) и
 * интервалы между соседними шагами из одной ноты. Интервал от якоря не пишется: якорь виден
 * не всегда. Время — только у шагов верно с первой попытки и без подсказки над ними.
 */
export function sequenceEvents(sequence: Sequence, records: readonly StepOutcome[]): StatEvent[] {
  const events: StatEvent[] = []
  const singleNotes = sequence.anchor !== null
  sequence.steps.forEach((step, index) => {
    const record = records[index]
    const outcome = stepOutcome(record)
    if (!outcome) return
    const ms = outcome === 'clean' && !record.hinted ? record.reactionMs : null
    for (const pitch of step) {
      events.push({ kind: 'note', key: noteKey(sequence.clef, pitch), outcome, ms })
    }
    if (singleNotes && index > 0) {
      const { size, direction } = intervalBetween(sequence.steps[index - 1][0], step[0])
      events.push({ kind: 'interval', key: intervalKey(size, direction), outcome, ms })
    }
  })
  return events
}

/** Итог ноты «Разминки»: верно сразу, верно после неверных нажатий, не успел. */
export type WarmupOutcome = 'clean' | 'error' | 'missed'

export interface WarmupResult {
  pitch: number
  clef: Clef
  outcome: WarmupOutcome
  /** От появления ноты до верного нажатия; только у верной с первой попытки. */
  ms: number | null
}

/** Событие ноты «Разминки»: «не успел» хранится вместе с пропусками — отдельно от ошибок. */
export function warmupEvent(result: WarmupResult): StatEvent {
  return {
    kind: 'note',
    key: noteKey(result.clef, result.pitch),
    outcome: result.outcome === 'missed' ? 'skip' : result.outcome,
    ms: result.outcome === 'clean' ? result.ms : null,
  }
}
