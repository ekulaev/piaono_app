import { DEFAULT_WARMUP_SETTINGS } from '../warmup/settings'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SEQUENCE_SETTINGS } from '../sequences/settings'
import { back, chooseMode, closeMenu, confirm, editDraft, MENU_CLOSED, openMenu } from './modeMenu'
import { DEFAULT_MODE, isModeId, MODES, modeInfo } from './modes'

describe('Меню режимов и список режимов', () => {
  it('Открыть меню: показан список', () => {
    expect(openMenu()).toEqual({ screen: 'list' })
  })

  it('Шесть режимов: прежние пять в прежнем порядке, затем «Длительности»; неизвестного нет', () => {
    expect(MODES.map((mode) => mode.id)).toEqual([
      'sequences',
      'contour',
      'rhythm',
      'warmup',
      'intervals',
      'durations',
    ])
    expect(modeInfo('intervals').hasSettings).toBe(true)
    expect(modeInfo('durations').hasSettings).toBe(true)
    expect(isModeId('melody')).toBe(false)
  })

  it('по умолчанию активна «Разминка»', () => {
    expect(modeInfo(DEFAULT_MODE).id).toBe('warmup')
  })
})

describe('Экран режима', () => {
  it('Экран «Разминки»: выбор в списке открывает экран режима с копией настроек', () => {
    const state = chooseMode(openMenu(), 'warmup', DEFAULT_WARMUP_SETTINGS)
    expect(state).toEqual({ screen: 'mode', modeId: 'warmup', draft: DEFAULT_WARMUP_SETTINGS })
    expect(modeInfo('warmup').hasSettings).toBe(true)
  })
})

describe('Выбрать, Старт, Назад', () => {
  it('Выбрать: меню закрыто, режим становится активным', () => {
    expect(confirm(chooseMode(openMenu(), 'warmup', DEFAULT_WARMUP_SETTINGS))).toEqual({
      menu: MENU_CLOSED,
      activeMode: 'warmup',
      settings: DEFAULT_WARMUP_SETTINGS,
    })
  })

  it('Назад: снова список, активный режим не меняется', () => {
    const state = back(chooseMode(openMenu(), 'warmup', null))
    expect(state).toEqual({ screen: 'list' })
    expect(confirm(state).activeMode).toBeNull()
  })
})

describe('Закрытие меню', () => {
  it('Esc / «Закрыть» / касание вне меню: закрыто, ничего не подтверждено', () => {
    const state = closeMenu()
    expect(state).toBe(MENU_CLOSED)
    expect(confirm(state).activeMode).toBeNull()
  })
})

describe('Черновик настроек', () => {
  const confirmed = DEFAULT_SEQUENCE_SETTINGS

  it('«Выбрать» возвращает изменённые настройки', () => {
    let state = chooseMode(openMenu(), 'sequences', confirmed)
    state = editDraft(state, { ...confirmed, notesPerStep: 2 })
    const result = confirm(state)
    expect(result.activeMode).toBe('sequences')
    expect(result.settings).toEqual({ ...confirmed, notesPerStep: 2 })
  })

  it('«Назад» отбрасывает черновик: подтверждённые не меняются', () => {
    let state = chooseMode(openMenu(), 'sequences', confirmed)
    state = editDraft(state, { ...confirmed, sequences: 1 })
    state = chooseMode(back(state), 'sequences', confirmed)
    expect(state.screen === 'mode' && state.draft).toEqual(confirmed)
    expect(confirmed.sequences).toBe(10)
  })
})
