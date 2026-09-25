import { levelFromPressure, levelFromVelocity } from './levels'
import type { KeyboardState, KeyInput, Level, PlayedNote, TouchHold } from './types'

export function createKeyboardState(glissando = false): KeyboardState {
  return { piano: new Map(), touches: new Map(), glissando }
}

export interface ReduceResult {
  state: KeyboardState
  /** Сыгранная нота, если это событие — нажатие клавиши; иначе null. */
  playedNote: PlayedNote | null
}

/**
 * Единственное место, где меняется состояние клавиатуры. Чистая функция: старое состояние
 * не трогает. Если событие ничего не меняет, возвращает тот же объект состояния —
 * React тогда не перерисовывает клавиатуру (важно для частых touchMove).
 */
export function reduce(state: KeyboardState, input: KeyInput): ReduceResult {
  switch (input.kind) {
    case 'pianoDown': {
      const piano = new Map(state.piano)
      piano.set(input.pitch, input.velocity)
      return {
        state: { ...state, piano },
        playedNote: {
          pitch: input.pitch,
          level: levelFromVelocity(input.velocity),
          source: 'piano',
        },
      }
    }

    case 'pianoUp': {
      if (!state.piano.has(input.pitch)) return unchanged(state)
      const piano = new Map(state.piano)
      piano.delete(input.pitch)
      // Пианино главнее: его отпускание отпускает клавишу, даже если палец ещё на экране.
      const touches = mapTouches(state.touches, (hold) =>
        hold.pitch === input.pitch ? { ...hold, cancelled: true } : hold,
      )
      return { state: { ...state, piano, touches }, playedNote: null }
    }

    case 'touchDown': {
      const level = levelFromPressure(input.pressure)
      const touches = new Map(state.touches)
      touches.set(input.pointerId, { pitch: input.pitch, level, cancelled: false })
      return {
        state: { ...state, touches },
        playedNote: { pitch: input.pitch, level, source: 'touch' },
      }
    }

    case 'touchMove': {
      const hold = state.touches.get(input.pointerId)
      // Без глиссандо палец держит клавишу, с которой начал, до отрыва.
      // Палец вне клавиш (pitch null) тоже ничего не меняет.
      if (!hold || !state.glissando || input.pitch === null || input.pitch === hold.pitch) {
        return unchanged(state)
      }
      const touches = new Map(state.touches)
      touches.set(input.pointerId, { pitch: input.pitch, level: hold.level, cancelled: false })
      return {
        state: { ...state, touches },
        playedNote: { pitch: input.pitch, level: hold.level, source: 'touch' },
      }
    }

    case 'touchUp': {
      if (!state.touches.has(input.pointerId)) return unchanged(state)
      const touches = new Map(state.touches)
      touches.delete(input.pointerId)
      return { state: { ...state, touches }, playedNote: null }
    }

    case 'setGlissando': {
      if (state.glissando === input.enabled) return unchanged(state)
      return { state: { ...state, glissando: input.enabled }, playedNote: null }
    }
  }
}

/** Нажата ли клавиша: держит пианино или хотя бы один не отменённый палец. */
export function isPressed(state: KeyboardState, pitch: number): boolean {
  return levelOf(state, pitch) !== null
}

/** Уровень интенсивности нажатой клавиши или null, если она отпущена. Пианино главнее. */
export function levelOf(state: KeyboardState, pitch: number): Level | null {
  const velocity = state.piano.get(pitch)
  if (velocity !== undefined) return levelFromVelocity(velocity)

  let level: Level | null = null
  state.touches.forEach((hold) => {
    if (hold.pitch === pitch && !hold.cancelled && (level === null || hold.level > level)) {
      level = hold.level
    }
  })
  return level
}

/** Все удерживаемые ноты: с пианино (в том числе вне A0–C8) и не отменённые касания. */
export function heldPitches(state: KeyboardState): Set<number> {
  const held = new Set(state.piano.keys())
  state.touches.forEach((hold) => {
    if (!hold.cancelled) held.add(hold.pitch)
  })
  return held
}

function unchanged(state: KeyboardState): ReduceResult {
  return { state, playedNote: null }
}

function mapTouches(
  touches: ReadonlyMap<number, TouchHold>,
  update: (hold: TouchHold) => TouchHold,
): Map<number, TouchHold> {
  const next = new Map<number, TouchHold>()
  touches.forEach((hold, pointerId) => next.set(pointerId, update(hold)))
  return next
}
