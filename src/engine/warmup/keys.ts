// Тональности «Разминки» (C-STF-9, приложение Г): 15 наборов знаков при ключе, в каждом мажор
// и минор. Ноты строятся из знаков при ключе, поэтому мажор и минор с одними знаками играются
// одинаково (Р-2): различие только в названии. Слов здесь нет — названия в переводах.

import type { Letter } from './steps'

export type Alteration = -1 | 0 | 1

export interface Tonality {
  /** Стабильный идентификатор для сохранения и перевода: «G-major», «Fs-minor», «Bb-major». */
  id: string
  /** Число знаков при ключе, 0–7. */
  signs: number
  kind: 'none' | 'sharp' | 'flat'
  mode: 'major' | 'minor'
  /** Какие ступени (буквы) стоят со знаком, в порядке записи на стане. */
  altered: readonly Letter[]
  /** Название мажорной тональности с теми же знаками на языке VexFlow: «G», «F#», «Bb». */
  signature: string
}

/** Порядок диезов и бемолей в ключе. */
const SHARP_ORDER: readonly Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER: readonly Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

/** Тоники по числу знаков: диезные 0–7, бемольные 1–7. Первая — мажор, вторая — минор. */
const SHARP_TONICS: readonly (readonly [string, string])[] = [
  ['C', 'A'],
  ['G', 'E'],
  ['D', 'B'],
  ['A', 'Fs'],
  ['E', 'Cs'],
  ['B', 'Gs'],
  ['Fs', 'Ds'],
  ['Cs', 'As'],
]
const FLAT_TONICS: readonly (readonly [string, string])[] = [
  ['F', 'D'],
  ['Bb', 'G'],
  ['Eb', 'C'],
  ['Ab', 'F'],
  ['Db', 'Bb'],
  ['Gb', 'Eb'],
  ['Cb', 'Ab'],
]

function build(
  signs: number,
  kind: Tonality['kind'],
  order: readonly Letter[],
  tonics: readonly [string, string],
): Tonality[] {
  const altered = order.slice(0, signs)
  const signature = tonics[0].replace('s', '#')
  return [
    { id: `${tonics[0]}-major`, signs, kind, mode: 'major', altered, signature },
    { id: `${tonics[1]}-minor`, signs, kind, mode: 'minor', altered, signature },
  ]
}

/** 30 тональностей в порядке списка: без знаков, диезы 1–7, бемоли 1–7; в наборе мажор, затем минор. */
export const TONALITIES: readonly Tonality[] = [
  ...SHARP_TONICS.flatMap((tonics, signs) =>
    build(signs, signs === 0 ? 'none' : 'sharp', SHARP_ORDER, tonics),
  ),
  ...FLAT_TONICS.flatMap((tonics, index) => build(index + 1, 'flat', FLAT_ORDER, tonics)),
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
