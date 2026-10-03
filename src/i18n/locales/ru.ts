// Русский: исходный язык приложения; тексты перенесены дословно.

import type { Locale, Message } from '../types'
import type { MessageKey } from './en'

const messages = {
  'language.button': 'Язык: {name}',
  'language.list': 'Языки',
} satisfies Record<MessageKey, Message>

const ru: Locale<MessageKey> = { code: 'ru', name: 'Русский', flag: 'ru', order: 1, messages }
export default ru
