import type { SequenceSettings } from '../sequences/settings'
import type { ModeId } from './modes'

/** Настройки режима на экране режима; у «Разминки» настроек нет — null. */
export type ModeSettings = SequenceSettings | null

/**
 * Меню режимов как автомат: закрыто → список → экран режима → закрыто.
 * Чистые функции без React: так видно (и проверяется тестами), что «Назад» и закрытие
 * ничего не меняют, а «Выбрать» и «Старт» делают режим активным.
 */
export type MenuState =
  | { screen: 'closed' }
  | { screen: 'list' }
  /** draft — настройки, которые ученик меняет на экране режима; подтверждаются «Выбрать»/«Старт». */
  | { screen: 'mode'; modeId: ModeId; draft: ModeSettings }

export const MENU_CLOSED: MenuState = { screen: 'closed' }

export function openMenu(): MenuState {
  return { screen: 'list' }
}

/** Экран режима открывается с копией подтверждённых настроек — это черновик. */
export function chooseMode(state: MenuState, modeId: ModeId, confirmed: ModeSettings): MenuState {
  return state.screen === 'list'
    ? { screen: 'mode', modeId, draft: confirmed && { ...confirmed } }
    : state
}

/** Изменение настройки на экране режима меняет только черновик. */
export function editDraft(state: MenuState, draft: ModeSettings): MenuState {
  return state.screen === 'mode' ? { ...state, draft } : state
}

/** «Назад»: к списку. Черновик отбрасывается, активный режим не меняется. */
export function back(state: MenuState): MenuState {
  return state.screen === 'mode' ? { screen: 'list' } : state
}

/** «Закрыть», касание вне меню, Esc: ничего не подтверждается, черновик отбрасывается. */
export function closeMenu(): MenuState {
  return MENU_CLOSED
}

/**
 * «Выбрать» или «Старт» на экране режима: меню закрывается, режим экрана становится
 * активным, черновик настроек — подтверждёнными. Запустить упражнение после «Старт» — забота вызывающего.
 */
export function confirm(state: MenuState): {
  menu: MenuState
  activeMode: ModeId | null
  settings: ModeSettings
} {
  if (state.screen !== 'mode') return { menu: state, activeMode: null, settings: null }
  return { menu: MENU_CLOSED, activeMode: state.modeId, settings: state.draft }
}
