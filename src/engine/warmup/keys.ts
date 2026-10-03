// Тональности «Разминки» (C-STF-9, приложение Г): 15 наборов знаков при ключе. Мажор и минор с
// одними знаками не различаются (Р-2, Р-28): знак при ключе один, а ноты задаёт диапазон, поэтому
// запись одна на набор — в списке она называется «<Мажор> / <Минор>». Слов здесь нет — названия
// в переводах.

import type { Letter } from './steps'

export type Alteration = -1 | 0 | 1

export interface Tonality {
  /**
   * Стабильный идентификатор для сохранения и перевода — по мажорной тональности набора:
   * «C-major», «G-major», «Bb-major». Параллельный минор в идентификаторе не нужен.
   */
  id: string
  /** Число знаков при ключе, 0–7. */
  signs: number
  kind: 'none' | 'sharp' | 'flat'
  /** Какие ступени (буквы) стоят со знаком, в порядке записи на стане. */
  altered: readonly Letter[]
  /** Название мажорной тональности набора на языке VexFlow: «G», «F#», «Bb». */
  signature: string
}

/** Порядок диезов и бемолей в ключе. */
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

/** Мажорные тоники по числу знаков: диезные 0–7, бемольные 1–7. */
const SHARP_MAJORS = ['C', 'G', 'D', 'A', 'E', 'B', 'Fs', 'Cs']
const FLAT_MAJORS = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']

function build(
  signs: number,
  kind: Tonality['kind'],
  order: readonly Letter[],
  major: string,
): Tonality {
  return {
    id: `${major}-major`,
    signs,
    kind,
    altered: order.slice(0, signs),
    signature: major.replace('s', '#'),
  }
}

/** 15 тональностей в порядке списка: без знаков, диезы 1–7, бемоли 1–7. */
export const TONALITIES: readonly Tonality[] = [
  ...SHARP_MAJORS.map((major, signs) =>
    build(signs, signs === 0 ? 'none' : 'sharp', SHARP_ORDER, major),
  ),
  ...FLAT_MAJORS.map((major, index) => build(index + 1, 'flat', FLAT_ORDER, major)),
]

export const DEFAULT_TONALITY_ID = 'C-major'

export function isTonalityId(value: unknown): value is string {
  return TONALITIES.some((tonality) => tonality.id === value)
}

export function tonalityById(id: string): Tonality {
  return TONALITIES.find((tonality) => tonality.id === id) ?? TONALITIES[0]
}

/** Знак ступени-буквы в тональности: +1 диез, −1 бемоль, 0 без знака. */
export function alterationOf(tonality: Tonality, letter: Letter): Alteration {
  if (!tonality.altered.includes(letter)) return 0
  return tonality.kind === 'sharp' ? 1 : -1
}
