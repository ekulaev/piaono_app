import { describe, expect, it } from 'vitest'
import { back, chooseMode, closeMenu, confirm, MENU_CLOSED, openMenu } from './modeMenu'
import { DEFAULT_MODE, isModeId, MODES, modeInfo } from './modes'

describe('Меню режимов и список режимов', () => {
  it('Открыть меню: показан список', () => {
    expect(openMenu()).toEqual({ screen: 'list' })
  })

  it('Недоступный режим не показывается: в списке только «Разминка»', () => {
    expect(MODES.map((mode) => mode.title)).toEqual(['Разминка'])
    expect(isModeId('sequences')).toBe(false)
  })

  it('по умолчанию активна «Разминка»', () => {
    expect(modeInfo(DEFAULT_MODE).title).toBe('Разминка')
  })
})

describe('Экран режима', () => {
  it('Экран «Разминки»: выбор в списке открывает экран режима без настроек', () => {
    const state = chooseMode(openMenu(), 'warmup')
    expect(state).toEqual({ screen: 'mode', modeId: 'warmup' })
    expect(modeInfo('warmup').hasSettings).toBe(false)
  })
})

describe('Выбрать, Старт, Назад', () => {
  it('Выбрать: меню закрыто, режим становится активным', () => {
    expect(confirm(chooseMode(openMenu(), 'warmup'))).toEqual({
      menu: MENU_CLOSED,
      activeMode: 'warmup',
    })
  })

  it('Назад: снова список, активный режим не меняется', () => {
    const state = back(chooseMode(openMenu(), 'warmup'))
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
