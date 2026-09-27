// Оценка попытки по темпу самого ученика (C-STF-6, OB-7, LIM-5). Метронома нет: темп
// подбирается по ударам, и оценка зависит только от пропорций между ними.

import type { Pattern } from './generate'

export type Mark = 'onTime' | 'early' | 'late'

/** «Вовремя» — отклонение не больше этой доли самой короткой длительности рисунка (LIM-5). */
export const TOLERANCE_SHARE = 0.25

/** Темп как прямая: удар по месту x (тики) ожидается в start + msPerTick × x. */
export interface Tempo {
  start: number
  msPerTick: number
}

/**
 * Прямая, ближайшая к ударам (наименьшие квадраты): x — место ноты в тиках, t — время удара.
 * Мест всегда не меньше двух разных, поэтому знаменатель не ноль.
 */
export function fitTempo(places: readonly number[], times: readonly number[]): Tempo {
  const n = places.length
  const meanX = places.reduce((sum, x) => sum + x, 0) / n
  const meanT = times.reduce((sum, t) => sum + t, 0) / n
  let covariance = 0
  let variance = 0
  for (let i = 0; i < n; i++) {
    covariance += (places[i] - meanX) * (times[i] - meanT)
    variance += (places[i] - meanX) ** 2
  }
  const msPerTick = covariance / variance
  return { start: meanT - msPerTick * meanX, msPerTick }
}

/**
 * Темп ученика. Простая подгонка по всем ударам в коротком рисунке «съедает» ошибку: сбитая
 * нота тянет темп за собой и сама оказывается почти на месте. Поэтому сначала ищется темп, при
 * котором на свои места ложится больше всего ударов (перебор прямых через каждые два удара),
 * а потом он уточняется наименьшими квадратами только по этим ударам.
 */
export function studentTempo(
  places: readonly number[],
  times: readonly number[],
  shortestTicks: number,
): Tempo {
  const agreeing = (tempo: Tempo) =>
    places
      .map((_, i) => i)
      .filter(
        (i) => Math.abs(deviation(tempo, places[i], times[i])) <= tolerance(tempo, shortestTicks),
      )

  let best: number[] = []
  let bestError = Infinity
  for (let i = 0; i < places.length; i++) {
    for (let j = i + 1; j < places.length; j++) {
      const msPerTick = (times[j] - times[i]) / (places[j] - places[i])
      if (msPerTick <= 0) continue
      const through = { start: times[i] - msPerTick * places[i], msPerTick }
      const chosen = agreeing(through)
      if (chosen.length < 2 || chosen.length < best.length) continue
      // Из равных по числу согласных ударов — тот, при котором ближе к местам все удары:
      // в рисунке из 3 нот любые две согласны между собой, и решает третья.
      const refined = fitTempo(
        chosen.map((k) => places[k]),
        chosen.map((k) => times[k]),
      )
      const error =
        places.reduce((sum, x, k) => sum + deviation(refined, x, times[k]) ** 2, 0) /
        refined.msPerTick ** 2
      if (chosen.length > best.length || error < bestError) {
        best = chosen
        bestError = error
      }
    }
  }
  if (best.length < 2) return fitTempo(places, times)
  return fitTempo(
    best.map((k) => places[k]),
    best.map((k) => times[k]),
  )
}

const deviation = (tempo: Tempo, place: number, time: number) =>
  time - (tempo.start + tempo.msPerTick * place)
const tolerance = (tempo: Tempo, shortestTicks: number) =>
  TOLERANCE_SHARE * shortestTicks * Math.abs(tempo.msPerTick)

/** Оценки нот рисунка по временам ударов (по одному на ноту, по порядку). */
export function evaluateTaps(pattern: Pattern, taps: readonly number[]): Mark[] {
  const places = pattern.notes.map((note) => note.at)
  const shortest = Math.min(...pattern.notes.map((note) => note.ticks))
  const tempo = studentTempo(places, taps, shortest)
  return taps.map((time, i) => {
    const d = deviation(tempo, places[i], time)
    if (Math.abs(d) <= tolerance(tempo, shortest)) return 'onTime'
    return d < 0 ? 'early' : 'late'
  })
}
