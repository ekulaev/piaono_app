import type { ReactNode } from 'react'
import type { ConnectionState, MidiDeviceInfo } from '../../midi/types'
import { StatusIcon } from '../ConnectionStatus'
import { STATUS_TITLE_KEY, statusClass } from '../connectionTexts'
import HintButton from '../hints/HintButton'
import { connectionHintId } from '../hints/hints'
import { Stepper, Toggle } from '../controls/Controls'
import { MAX_NOTE_ECHO_MS, MIN_NOTE_ECHO_MS, NOTE_ECHO_STEP_MS } from '../../storage/settings'
import ScreenHeader from '../ScreenHeader'
import './SettingsScreen.css'
import { useI18n } from '../i18n/useI18n'

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
  /** Время показа нажатой ноты в миллисекундах (C-STF-8). */
  noteEchoEnabled: boolean
  onChangeNoteEchoEnabled: (enabled: boolean) => void
  noteEchoMs: number
  onChangeNoteEchoMs: (ms: number) => void
  updateReady: boolean
  onApplyUpdate: () => void
  onBack: () => void
}

interface RowProps {
  label: string
  /** Настройка сейчас не действует: название приглушено. */
  disabled?: boolean
  children: ReactNode
}

/** Одна настройка — одна строка: название слева, значение или кнопка справа (C-APP-1, OB-8). */
function SettingsRow({ label, disabled = false, children }: RowProps) {
  return (
    <li className={`settings-row${disabled ? ' settings-row--disabled' : ''}`}>
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
  noteEchoEnabled,
  onChangeNoteEchoEnabled,
  noteEchoMs,
  onChangeNoteEchoMs,
  updateReady,
  onApplyUpdate,
  onBack,
}: Props) {
  const { t, date, seconds } = useI18n()
  const active = devices.find((device) => device.id === activeDeviceId)
  return (
    <main className="screen settings">
      <ScreenHeader title={t('settings.title')} onBack={onBack} />

      {/* Если строки не помещаются по высоте, прокручивается только список. */}
      <ul className="settings__list">
        <SettingsRow label={t('settings.piano')}>
          <span className={`${statusClass(connectionState)} settings__status`}>
            <StatusIcon />
            <span className="status__title">{t(STATUS_TITLE_KEY[connectionState])}</span>
          </span>
          {active && (
            <span className="settings__device-name">{active.name || t('device.unnamed')}</span>
          )}
          {/* Перезапуск не поможет, если браузер вообще не умеет MIDI (C-APP-1, Р-9). */}
          {connectionState !== 'unsupported' && (
            <button type="button" className="button" onClick={onReconnect}>
              {t('settings.reconnect')}
            </button>
          )}
          {/* Что делать при этом состоянии — в подсказке, а не строкой под строкой (C-APP-2). */}
          <HintButton id={connectionHintId(connectionState)} />
        </SettingsRow>

        {devices.length > 1 && (
          <SettingsRow label={t('settings.device')}>
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
                      <span className="device__name">{device.name || t('device.unnamed')}</span>
                      {isActive && <span className="device__mark">{t('settings.listening')}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </SettingsRow>
        )}

        <SettingsRow label={t('settings.check')}>
          <button type="button" className="button" onClick={onOpenCheck}>
            {t('settings.open')}
          </button>
        </SettingsRow>

        <SettingsRow label={t('settings.glissando')}>
          <Toggle
            compact
            label={t('settings.glissando')}
            checked={glissando}
            onChange={onToggleGlissando}
          />
        </SettingsRow>

        <SettingsRow label={t('settings.noteEchoOn')}>
          <Toggle
            compact
            label={t('settings.noteEchoOn')}
            checked={noteEchoEnabled}
            onChange={onChangeNoteEchoEnabled}
          />
        </SettingsRow>

        {/* Выключен показ — время остаётся на экране, но заблокировано (C-STF-8, OB-22). */}
        <SettingsRow label={t('settings.noteEcho')} disabled={!noteEchoEnabled}>
          <Stepper
            compact
            disabled={!noteEchoEnabled}
            label={t('settings.noteEcho')}
            value={noteEchoMs}
            min={MIN_NOTE_ECHO_MS}
            max={MAX_NOTE_ECHO_MS}
            step={NOTE_ECHO_STEP_MS}
            format={seconds}
            onChange={onChangeNoteEchoMs}
          />
        </SettingsRow>

        <SettingsRow label={t('settings.version')}>
          <span>{t('settings.build', { date: date(__BUILD_DATE__) })}</span>
          {updateReady && (
            <button type="button" className="button" onClick={onApplyUpdate}>
              {t('topbar.update')}
            </button>
          )}
        </SettingsRow>
      </ul>
    </main>
  )
}

export default SettingsScreen
