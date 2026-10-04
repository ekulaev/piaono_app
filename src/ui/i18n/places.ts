import type { MessageKey } from '../../i18n'
import { intervalLabel } from '../../engine/stats/labels'
import { isFigureId } from '../../engine/rhythm/figures'
import type { StatKind } from '../../engine/stats/stats'
import { pitchToNoteName } from '../../midi/noteNames'
import { noteLabel } from '../../engine/warmup/noteLabel'
import { isIntervalTaskType, parseTaskType } from '../../engine/solfege/intervals/intervals'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

/**
 * Подпись места статистики: «C4», «C3 (бас)», «↑3», «=» (на месте), «две восьмые». Ноты и
 * интервалы пишутся одинаково на всех языках; переводятся только слова. Для нот «Разминки»
 * передаётся тональность: ноты со знаками называются по ней, с ♯ или ♭ (C-STF-9, Р-19).
 */
export function placeLabel(t: Translate, kind: StatKind, key: string, tonality?: string): string {
  if (kind === 'figure') return isFigureId(key) ? t(`figure.${key}`) : key
  if (kind === 'interval') return intervalLabel(key)
  if (kind === 'task') return taskLabel(t, key)
  const [clef, pitch] = key.split(':')
  const name = tonality ? noteName(Number(pitch), tonality) : pitchToNoteName(Number(pitch))
  return `${name}${clef === 'bass' ? ` ${t('place.bass')}` : ''}`
}

/** «F♯4», «B♭3»: буква, знак и октава по тональности. */
function noteName(pitch: number, tonality: string): string {
  const { letter, alteration, octave } = noteLabel(pitch, tonality)
  return `${letter}${alteration === 1 ? '♯' : alteration === -1 ? '♭' : ''}${octave}`
}

/** Тип задания «Интервалов» словами: «Узнай: малая терция ↓» (C-SOL-2, OB-12). */
export function taskLabel(t: Translate, key: string): string {
  if (!isIntervalTaskType(key)) return key
  const { variant, direction, id } = parseTaskType(key)
  return t(`solfege.task.${variant}`, {
    interval: t(`interval.full.${id}`),
    arrow: direction === 'up' ? '↑' : '↓',
  })
}
