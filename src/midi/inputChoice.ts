import type { MidiDeviceInfo, PreferredInput } from './types'

/**
 * Какой вход слушать. Ровно один: иначе ноты дублируются (пианино с двумя портами) или
 * приходят с чужого устройства.
 *
 * 1. Выбранный учеником вход — по id.
 * 2. Если такого id нет (на Android id может смениться после переподключения) — по имени.
 * 3. Иначе — первый вход в порядке браузера. Выбор ученика при этом не забывается:
 *    когда его вход вернётся, он снова станет активным.
 */
export function chooseActiveInput(
  inputs: readonly MidiDeviceInfo[],
  preferred: PreferredInput | null,
): string | null {
  if (inputs.length === 0) return null
  if (preferred) {
    const byId = inputs.find((input) => input.id === preferred.id)
    if (byId) return byId.id
    const byName = inputs.find((input) => input.name === preferred.name)
    if (byName) return byName.id
  }
  return inputs[0].id
}
