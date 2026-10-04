// Проверка ответа (C-SOL-1, OB-3…OB-6). Чистые функции: высоты — номера MIDI.

import type { ValueAnswer } from './types'

/** Ответ-нота: верна только та же высота, с октавой; энгармонизм — одна клавиша (OB-3). */
export function isSameNote(expected: number, played: number): boolean {
  return expected === played
}

/**
 * Значение клавиши по таблице режима, в любой октаве (OB-4); null — клавиши в таблице нет,
 * такое нажатие не засчитывается ни верным, ни неверным.
 */
export function valueOfKey(table: ValueAnswer['table'], pitch: number): string | null {
  return table[((pitch % 12) + 12) % 12] ?? null
}

/** Длинный ответ после последней ноты: верна ли каждая сыгранная нота на своём месте (OB-6). */
export function evaluateLong(expected: readonly number[], played: readonly number[]): boolean[] {
  return expected.map((pitch, i) => played[i] !== undefined && isSameNote(pitch, played[i]))
}
