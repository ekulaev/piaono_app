import { describe, expect, it } from 'vitest'
import { chooseActiveInput } from './inputChoice'

const piano = { id: 'p1', name: 'Piano' }
const synth = { id: 's1', name: 'Synth' }

describe('Один активный вход', () => {
  it('Один вход — он и активен', () => {
    expect(chooseActiveInput([piano], null)).toBe('p1')
  })

  it('Два входа без выбора — первый', () => {
    expect(chooseActiveInput([piano, synth], null)).toBe('p1')
  })

  it('Два входа с выбором — выбранный', () => {
    expect(chooseActiveInput([piano, synth], { id: 's1', name: 'Synth' })).toBe('s1')
  })

  it('входов нет — null', () => {
    expect(chooseActiveInput([], { id: 's1', name: 'Synth' })).toBeNull()
  })
})

describe('Выбор узнаёт вход после переподключения', () => {
  it('Новый идентификатор после переподключения — находим по имени', () => {
    expect(chooseActiveInput([piano, { id: 's2', name: 'Synth' }], synth)).toBe('s2')
  })

  it('id важнее имени: два одинаковых устройства', () => {
    const twinA = { id: 'a', name: 'Piano' }
    const twinB = { id: 'b', name: 'Piano' }
    expect(chooseActiveInput([twinA, twinB], { id: 'b', name: 'Piano' })).toBe('b')
  })
})

describe('Пропажа активного входа при оставшихся других', () => {
  it('Выбранный вход выдернули — активен оставшийся', () => {
    expect(chooseActiveInput([piano], synth)).toBe('p1')
  })
})
