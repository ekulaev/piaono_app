import { describeNote } from '../../engine/noteEcho/describeNote'
import type { LegendLabel } from '../keyboard/Keyboard'

export interface LegendRowItem {
  /** Ступень от «до»: 0–11. */
  pitchClass: number
  /** «Do», «Do♯» — как на карточке нажатой ноты (C-STF-8). */
  name: string
  label: LegendLabel
}

/**
 * Легенда без клавиатуры (C-SOL-1, OB-15; C-APP-5, OB-17): пары «клавиша — значение» по порядку
 * ступеней от «до», без октав. Те же подписи, что над клавишами.
 */
export function legendRowItems(labels: Readonly<Record<number, LegendLabel>>): LegendRowItem[] {
  return Object.entries(labels)
    .map(([pc, label]) => {
      const pitchClass = Number(pc)
      const note = describeNote(60 + pitchClass)
      return { pitchClass, name: `${note.solfege}${note.sharp ? '♯' : ''}`, label }
    })
    .sort((a, b) => a.pitchClass - b.pitchClass)
}
