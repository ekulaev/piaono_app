import { describe, expect, it } from 'vitest'
import { messages as en } from '../../i18n/locales/en'
import ru from '../../i18n/locales/ru'
import { SETTINGS_GROUPS } from './groups'

describe('Группы настроек (C-APP-6)', () => {
  it('четыре группы в порядке бара: Пианино, Клавиатура, Копия, Версия', () => {
    expect(SETTINGS_GROUPS.map((group) => group.id)).toEqual([
      'piano',
      'keyboard',
      'backup',
      'version',
    ])
  })

  it('название каждой группы есть на обоих языках и состоит из одного слова', () => {
    for (const { labelKey } of SETTINGS_GROUPS) {
      for (const text of [en[labelKey], ru.messages[labelKey]]) {
        expect(typeof text).toBe('string')
        expect(String(text).trim()).not.toMatch(/\s/)
      }
    }
  })
})
