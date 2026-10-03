import type { MessageKey } from '../../i18n'
import { intervalLabel } from '../../engine/stats/labels'
import { isFigureId } from '../../engine/rhythm/figures'
import type { StatKind } from '../../engine/stats/stats'
import { pitchToNoteName } from '../../midi/noteNames'

type Translate = (key: MessageKey) => string

/**
 * Подпись места статистики: «C4», «C3 (бас)», «↑3», «=» (на месте), «две восьмые». Ноты и
 * интервалы пишутся одинаково на всех языках; переводятся только слова.
 */
export function placeLabel(t: Translate, kind: StatKind, key: string): string {
  if (kind === 'figure') return isFigureId(key) ? t(`figure.${key}`) : key
  if (kind === 'interval') return intervalLabel(key)
  const [clef, pitch] = key.split(':')
  return `${pitchToNoteName(Number(pitch))}${clef === 'bass' ? ` ${t('place.bass')}` : ''}`
}
