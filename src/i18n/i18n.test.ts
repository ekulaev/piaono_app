import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  LOCALES,
  findLocale,
  formatDate,
  formatSeconds,
  resolveLanguage,
  translate,
} from '.'
import type { Locale } from './types'

const ru = findLocale('ru')!
const en = DEFAULT_LOCALE

describe('Язык при запуске (C-APP-3, OB-5…OB-7)', () => {
  const available = ['ru', 'en']

  it('система на русском → русский', () => {
    expect(resolveLanguage(null, ['ru-RU'], available)).toBe('ru')
  })

  it('региональный вариант считается своим языком', () => {
    expect(resolveLanguage(null, ['ru-BY'], available)).toBe('ru')
    expect(resolveLanguage(null, ['en-GB'], available)).toBe('en')
  })

  it('первый язык системы недоступен → следующий подходящий', () => {
    expect(resolveLanguage(null, ['de-DE', 'en-US'], available)).toBe('en')
    expect(resolveLanguage(null, ['de', 'ru'], available)).toBe('ru')
  })

  it('нет совпадений → английский', () => {
    expect(resolveLanguage(null, ['ja-JP'], available)).toBe('en')
    expect(resolveLanguage(null, [], available)).toBe('en')
  })

  it('выбор ученика сильнее языка системы', () => {
    expect(resolveLanguage('en', ['ru-RU'], available)).toBe('en')
  })

  it('сохранённого языка больше нет → как будто выбора не было', () => {
    expect(resolveLanguage('xx', ['ru-RU'], available)).toBe('ru')
  })
})

describe('Поиск текста (C-APP-3, OB-8, INV-3)', () => {
  const partial: Locale = { code: 'zz', name: 'Z', flag: null, order: 9, messages: {} }
  const base: Locale = {
    code: 'en',
    name: 'English',
    flag: null,
    order: 1,
    messages: {
      hello: 'Hello, {name}',
      attempts: { one: '{n} attempt', other: '{n} attempts' },
    },
  }
  const russian: Locale = {
    code: 'ru',
    name: 'Русский',
    flag: null,
    order: 2,
    messages: {
      attempts: {
        one: '{n} попытка',
        few: '{n} попытки',
        many: '{n} попыток',
        other: '{n} попытки',
      },
    },
  }

  it('нет перевода → английский текст', () => {
    expect(translate(partial, base, 'hello', { name: 'Ann' })).toBe('Hello, Ann')
  })

  it('нет и в английском → не падает, возвращается ключ', () => {
    expect(translate(partial, base, 'nothing')).toBe('nothing')
  })

  it('склонение по-русски: 1, 2, 5, 11, 21', () => {
    const t = (n: number) => translate(russian, base, 'attempts', { n })
    expect(t(1)).toBe('1 попытка')
    expect(t(2)).toBe('2 попытки')
    expect(t(5)).toBe('5 попыток')
    expect(t(11)).toBe('11 попыток')
    expect(t(21)).toBe('21 попытка')
  })

  it('склонение по-английски: две формы', () => {
    const t = (n: number) => translate(base, base, 'attempts', { n })
    expect(t(1)).toBe('1 attempt')
    expect(t(2)).toBe('2 attempts')
  })
})

describe('Числа и даты по языку (C-APP-3, OB-10)', () => {
  it('десятичный знак: «2,1» / «2.1»', () => {
    expect(formatSeconds('ru', 2100)).toBe('2,1')
    expect(formatSeconds('en', 2100)).toBe('2.1')
  })

  it('дата сборки: «27.09.2026» / «27 September 2026»', () => {
    const iso = new Date(2026, 8, 27, 12).toISOString()
    expect(formatDate('ru', iso)).toBe('27.09.2026')
    expect(formatDate('en', iso)).toBe('27 September 2026')
  })
})

describe('Файлы переводов (C-APP-3, OB-9, INV-2)', () => {
  it('код языка в имени файла совпадает с кодом языка, английский есть', () => {
    expect(LOCALES.map((l) => l.code).sort()).toEqual(['en', 'ru'])
  })

  it('в списке русский, затем английский', () => {
    expect(LOCALES.map((l) => l.name)).toEqual(['Русский', 'English'])
  })

  it('у русского те же ключи, что у английского', () => {
    expect(Object.keys(ru.messages).sort()).toEqual(Object.keys(en.messages).sort())
  })

  it('у каждого ключа обоих языков есть форма, которую выберет правило языка', () => {
    for (const locale of [ru, en]) {
      for (const [key, value] of Object.entries(locale.messages)) {
        if (value === undefined || typeof value === 'string') continue
        expect(value.other, `${locale.code}:${key}`).toBeTruthy()
      }
    }
  })
})

describe('Тексты не зашиты в экранах (C-APP-3, INV-2)', () => {
  it('в ui/ нет русских слов вне комментариев', () => {
    const sources = import.meta.glob<string>(
      ['../ui/**/*.ts', '../ui/**/*.tsx', '!../ui/**/*.test.*'],
      {
        query: '?raw',
        import: 'default',
        eager: true,
      },
    )
    const offenders: string[] = []
    for (const [file, source] of Object.entries(sources)) {
      source.split('\n').forEach((line, index) => {
        const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')
        const trimmed = code.trim()
        // Строки внутри блочных комментариев начинаются с «*»; JSX-комментарии — с «{/*».
        if (trimmed.startsWith('*') || trimmed.startsWith('{/*') || trimmed.startsWith('/*')) return
        if (/[А-Яа-яЁё]/.test(code)) offenders.push(`${file}:${index + 1}: ${trimmed}`)
      })
    }
    expect(Object.keys(sources).length).toBeGreaterThan(30)
    expect(offenders).toEqual([])
  })
})
