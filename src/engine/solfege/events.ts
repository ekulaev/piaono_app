// Из исхода задания — событие статистики (C-SOL-1, OB-16): ключ — тип задания.

import type { StatEvent } from '../stats/stats'
import type { Task, TaskRecord } from './types'

/** «Верно сразу» → clean со временем, «после ошибок» → error, «пропущено» → skip. */
export function taskEvent(task: Task, record: TaskRecord): StatEvent {
  return {
    kind: 'task',
    key: task.type,
    outcome: record.outcome,
    ms: record.outcome === 'clean' ? record.ms : null,
  }
}
