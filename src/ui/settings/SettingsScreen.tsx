import type { ReactNode } from 'react'
import type { ConnectionState, MidiDeviceInfo } from '../../midi/types'
import { StatusIcon } from '../ConnectionStatus'
import { STATUS_TITLE, statusClass } from '../connectionTexts'
import HintButton from '../hints/HintButton'
import { connectionHintId } from '../hints/hints'
import { Toggle } from '../controls/Controls'
import ScreenHeader from '../ScreenHeader'
import { formatBuildDate } from './buildDate'
import './SettingsScreen.css'

interface Props {
  connectionState: ConnectionState
  devices: MidiDeviceInfo[]
  /** Устройство, чьи ноты сейчас принимаются. */
  activeDeviceId: string | null
  onSelectDevice: (device: MidiDeviceInfo) => void
  /** Перезапустить приложение — заново запустить MIDI (C-APP-1, Р-4). */
  onReconnect: () => void
  onOpenCheck: () => void
  glissando: boolean
  onToggleGlissando: () => void
  updateReady: boolean
  onApplyUpdate: () => void
  onBack: () => void
}

interface RowProps {
  label: string
  children: ReactNode
}

/** Одна настройка — одна строка: название слева, значение или кнопка справа (C-APP-1, OB-8). */
function SettingsRow({ label, children }: RowProps) {
  return (
    <li className="settings-row">
      <div className="settings-row__main">
        <span className="settings-row__label">{label}</span>
        <div className="settings-row__value">{children}</div>
      </div>
    </li>
  )
}

/**
 * «Настройки» приложения: всё про пианино и само приложение. Изменения применяются и
 * сохраняются сразу — кнопки «Сохранить» нет. Настройки упражнений — в меню режимов.
 */
function SettingsScreen({
  connectionState,
  devices,
  activeDeviceId,
  onSelectDevice,
  onReconnect,
  onOpenCheck,
  glissando,
  onToggleGlissando,
  updateReady,
  onApplyUpdate,
  onBack,
}: Props) {
  const active = devices.find((device) => device.id === activeDeviceId)
  return (
    <main className="screen settings">
      <ScreenHeader title="Настройки" onBack={onBack} />

      {/* Если строки не помещаются по высоте, прокручивается только список. */}
      <ul className="settings__list">
        <SettingsRow label="Пианино">
          <span className={`${statusClass(connectionState)} settings__status`}>
            <StatusIcon />
            <span className="status__title">{STATUS_TITLE[connectionState]}</span>
          </span>
          {active && <span className="settings__device-name">{active.name}</span>}
          {/* Перезапуск не поможет, если браузер вообще не умеет MIDI (C-APP-1, Р-9). */}
          {connectionState !== 'unsupported' && (
            <button type="button" className="button" onClick={onReconnect}>
              Переподключить
            </button>
          )}
          {/* Что делать при этом состоянии — в подсказке, а не строкой под строкой (C-APP-2). */}
          <HintButton id={connectionHintId(connectionState)} />
        </SettingsRow>

        {devices.length > 1 && (
          <SettingsRow label="Устройство">
            {/* Каждое устройство — кнопка: касание делает его активным и запоминается. */}
            <ul className="devices__list">
              {devices.map((device) => {
                const isActive = device.id === activeDeviceId
                return (
                  <li key={device.id}>
                    <button
                      type="button"
                      className={`device${isActive ? ' device--active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => onSelectDevice(device)}
                    >
                      <span className="device__name">{device.name}</span>
                      {isActive && <span className="device__mark">слушаю</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </SettingsRow>
        )}

        <SettingsRow label="Проверка пианино">
          <button type="button" className="button" onClick={onOpenCheck}>
            Открыть
          </button>
        </SettingsRow>

        <SettingsRow label="Глиссандо">
          <Toggle compact label="Глиссандо" checked={glissando} onChange={onToggleGlissando} />
        </SettingsRow>

        <SettingsRow label="Версия">
          <span>сборка от {formatBuildDate(__BUILD_DATE__)}</span>
          {updateReady && (
            <button type="button" className="button" onClick={onApplyUpdate}>
              Обновить
            </button>
          )}
        </SettingsRow>
      </ul>
    </main>
  )
}

export default SettingsScreen
