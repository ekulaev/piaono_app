import type { ModeId } from './modes'

/**
 * Меню режимов как автомат: закрыто → список → экран режима → закрыто.
 * Чистые функции без React: так видно (и проверяется тестами), что «Назад» и закрытие
 * ничего не меняют, а «Выбрать» и «Старт» делают режим активным.
 */
export type MenuState =
  | { screen: 'closed' }
  | { screen: 'list' }
  | { screen: 'mode'; modeId: ModeId }

export const MENU_CLOSED: MenuState = { screen: 'closed' }

export function openMenu(): MenuState {
  return { screen: 'list' }
}

export function chooseMode(state: MenuState, modeId: ModeId): MenuState {
  return state.screen === 'list' ? { screen: 'mode', modeId } : state
}

/** «Назад»: к списку. Активный режим не меняется. */
export function back(state: MenuState): MenuState {
  return state.screen === 'mode' ? { screen: 'list' } : state
}

/** «Закрыть», касание вне меню, Esc: ничего не подтверждается. */
export function closeMenu(): MenuState {
  return MENU_CLOSED
}

/**
 * «Выбрать» или «Старт» на экране режима: меню закрывается, режим экрана становится
 * активным. Запустить упражнение после «Старт» — забота вызывающего.
 */
export function confirm(state: MenuState): { menu: MenuState; activeMode: ModeId | null } {
  if (state.screen !== 'mode') return { menu: state, activeMode: null }
  return { menu: MENU_CLOSED, activeMode: state.modeId }
}
