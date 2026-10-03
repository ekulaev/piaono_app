// Английский: язык по умолчанию и запасной. Ключи задаёт этот файл; русский обязан иметь те же
// (тест i18n.test.ts), прочие языки могут быть неполными — чего нет, берётся отсюда.

import type { Locale, Message } from '../types'

export const messages = {
  'language.button': 'Language: {name}',
  'language.list': 'Languages',
} satisfies Record<string, Message>

export type MessageKey = keyof typeof messages

const en: Locale<MessageKey> = { code: 'en', name: 'English', flag: 'gb', order: 2, messages }
export default en
