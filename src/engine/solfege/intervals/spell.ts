// Запись второй ноты интервала (C-SOL-2, OB-5): ступень по номеру интервала, знак — у ноты.
// Первая нота — белая клавиша, поэтому знак не больше одного (двойных знаков нет).

import { naturalPitch } from '../../warmup/steps'
import { intervalInfo, type Direction, type IntervalId } from './intervals'

/** Нота на стане: ступень (C0 = 0, C4 = 28) и знак: −1 ♭, 0 без знака, +1 ♯. */
export interface SpelledNote {
  step: number
  accidental: -1 | 0 | 1
  pitch: number
}

function spellAt(firstStep: number, steps: number, pitch: number): SpelledNote | null {
  const accidental = pitch - naturalPitch(firstStep + steps)
  if (accidental < -1 || accidental > 1) return null
  return { step: firstStep + steps, accidental: accidental as -1 | 0 | 1, pitch }
}

/**
 * Вторая нота от первой (ступень белой клавиши) на интервал в направлении. Тритон пишется
 * увеличенной квартой или уменьшённой квинтой — той, где знака нет (от фа вверх — си, от си
 * вверх — фа); если знак нужен в обеих, — увеличенной квартой.
 */
export function spellSecond(firstStep: number, id: IntervalId, direction: Direction): SpelledNote {
  const { semitones, steps } = intervalInfo(id)
  const sign = direction === 'up' ? 1 : -1
  const pitch = naturalPitch(firstStep) + sign * semitones
  const options = id === 'TT' ? [steps, steps + 1] : [steps]
  const spelled = options
    .map((s) => spellAt(firstStep, sign * s, pitch))
    .filter((note): note is SpelledNote => note !== null)
    .sort((a, b) => Math.abs(a.accidental) - Math.abs(b.accidental))
  if (spelled.length === 0)
    throw new Error(`Нет записи для ${id} ${direction} от ступени ${firstStep}`)
  return spelled[0]
}
