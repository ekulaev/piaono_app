// Группы экрана «Настройки» (C-APP-6): пункт бара и подзаголовок. Какие строки в группе —
// решает SettingsScreen: у строк разные условия показа, данными их не описать проще кода.

import type { ComponentType } from 'react'
import { InfoIcon, PlugIcon, ScreenKeysIcon } from '../icons/Icons'

export type SettingsGroupId = 'piano' | 'keyboard' | 'version'

export interface SettingsGroup {
  id: SettingsGroupId
  /** Название в одно слово на любом языке (C-APP-6, INV-2): пункт бара и подзаголовок. */
  labelKey: 'settings.group.piano' | 'settings.group.keyboard' | 'settings.group.version'
  Icon: ComponentType
}

/** Порядок — сверху вниз в баре; первая группа открывается при входе в «Настройки» (OB-5). */
export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  { id: 'piano', labelKey: 'settings.group.piano', Icon: PlugIcon },
  { id: 'keyboard', labelKey: 'settings.group.keyboard', Icon: ScreenKeysIcon },
  { id: 'version', labelKey: 'settings.group.version', Icon: InfoIcon },
]
