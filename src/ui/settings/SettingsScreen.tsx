import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { ConnectionState, MidiDeviceInfo } from '../../midi/types'
import { StatusIcon } from '../ConnectionStatus'
import { STATUS_TITLE_KEY, statusClass } from '../connectionTexts'
import HintButton from '../hints/HintButton'
import { connectionHintId } from '../hints/hints'
import { Stepper, Toggle } from '../controls/Controls'
import { MAX_NOTE_ECHO_MS, MIN_NOTE_ECHO_MS, NOTE_ECHO_STEP_MS } from '../../storage/settings'
import ScreenHeader from '../ScreenHeader'
import { CollapseIcon } from '../icons/Icons'
import { SETTINGS_GROUPS, type SettingsGroupId } from './groups'
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
  /** Окно компактное: строки «Экранная клавиатура» нет, клавиатуры нет вовсе (C-APP-5). */
  compact: boolean
  /** Клавиатура показана: без неё нет и строки «Глиссандо». */
  keyboardShown: boolean
  keyboardVisible: boolean
  onChangeKeyboardVisible: (visible: boolean) => void
  /** Время показа нажатой ноты в миллисекундах (C-STF-8). */
  noteEchoEnabled: boolean
  onChangeNoteEchoEnabled: (enabled: boolean) => void
  noteEchoMs: number
  onChangeNoteEchoMs: (ms: number) => void
  updateReady: boolean
  onApplyUpdate: () => void
  /** Бар групп свёрнут до значков (C-APP-6); на узком окне он свёрнут всегда — это делает CSS. */
  barCollapsed: boolean
  onChangeBarCollapsed: (collapsed: boolean) => void
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
 * Строки разложены по группам, видна одна; группы переключает бар справа (C-APP-6).
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
  compact,
  keyboardShown,
  keyboardVisible,
  onChangeKeyboardVisible,
  noteEchoEnabled,
  onChangeNoteEchoEnabled,
  noteEchoMs,
  onChangeNoteEchoMs,
  updateReady,
  onApplyUpdate,
  barCollapsed,
  onChangeBarCollapsed,
  onBack,
}: Props) {
  const { t, date, seconds } = useI18n()
  const active = devices.find((device) => device.id === activeDeviceId)
  // Экран создаётся заново при каждом входе — поэтому он всегда открывается на «Пианино»
  // (OB-5); поворот планшета экран не пересоздаёт, и группа остаётся (OB-13).
  const [groupId, setGroupId] = useState<SettingsGroupId>(SETTINGS_GROUPS[0].id)
  const group = SETTINGS_GROUPS.find((item) => item.id === groupId) ?? SETTINGS_GROUPS[0]
  const tabRefs = useRef(new Map<SettingsGroupId, HTMLButtonElement>())
  const ids = useId()
  const barId = `${ids}-bar`
  const panelId = `${ids}-panel`
  const tabId = (id: SettingsGroupId) => `${ids}-tab-${id}`

  /** Стрелки и Home / End сразу выбирают группу и переносят на неё фокус (вкладки WAI-ARIA). */
  function onBarKeyDown(event: KeyboardEvent) {
    const index = SETTINGS_GROUPS.findIndex((item) => item.id === groupId)
    const last = SETTINGS_GROUPS.length - 1
    const next = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key]
    if (next === undefined) return
    event.preventDefault()
    const target = SETTINGS_GROUPS[next].id
    setGroupId(target)
    tabRefs.current.get(target)?.focus()
  }

  const collapseLabel = t(barCollapsed ? 'settings.bar.expand' : 'settings.bar.collapse')
  // Кнопка над баром, а не в нём: высота бара нужна пунктам на низком окне (C-APP-6, Р-9).
  const collapseButton = (
    <button
      type="button"
      className="button settings__collapse"
      aria-expanded={!barCollapsed}
      aria-controls={barId}
      aria-label={collapseLabel}
      title={collapseLabel}
      onClick={() => onChangeBarCollapsed(!barCollapsed)}
    >
      <CollapseIcon direction={barCollapsed ? 'left' : 'right'} />
    </button>
  )

  return (
    <main className={`screen settings${barCollapsed ? ' settings--collapsed' : ''}`}>
      <ScreenHeader title={t('settings.title')} onBack={onBack} actions={collapseButton} />

      <div className="settings__body">
        <section
          className="settings__group"
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(group.id)}
        >
          <h2 className="settings__group-title">{t(group.labelKey)}</h2>
          {/* Прокручиваются только строки группы; key — новая группа начинается сверху (OB-6). */}
          <ul key={group.id} className="settings__list">
            {group.id === 'piano' && pianoRows()}
            {group.id === 'keyboard' && keyboardRows()}
            {group.id === 'version' && versionRows()}
          </ul>
        </section>

        <div
          className="settings__bar"
          id={barId}
          role="tablist"
          aria-orientation="vertical"
          aria-label={t('settings.bar.list')}
          onKeyDown={onBarKeyDown}
        >
          {SETTINGS_GROUPS.map(({ id, labelKey, Icon }) => {
            const selected = id === group.id
            return (
              <button
                key={id}
                ref={(node) => {
                  if (node) tabRefs.current.set(id, node)
                  else tabRefs.current.delete(id)
                }}
                type="button"
                role="tab"
                id={tabId(id)}
                aria-selected={selected}
                aria-controls={panelId}
                aria-label={t(labelKey)}
                title={t(labelKey)}
                tabIndex={selected ? 0 : -1}
                className={`settings__tab${selected ? ' settings__tab--selected' : ''}`}
                onClick={() => setGroupId(id)}
              >
                <Icon />
                <span className="settings__tab-label">{t(labelKey)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </main>
  )

  function pianoRows() {
    return (
      <>
        {/* «Связь», а не «Пианино»: подзаголовок группы уже «Пианино» (C-APP-6, Р-14). */}
        <SettingsRow label={t('settings.connection')}>
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
      </>
    )
  }

  function keyboardRows() {
    return (
      <>
        {/* На компактном экране клавиатуры нет вовсе, строки тоже (C-APP-5, OB-15). */}
        {!compact && (
          <SettingsRow label={t('settings.keyboard')}>
            <Toggle
              compact
              label={t('settings.keyboard')}
              checked={keyboardVisible}
              onChange={onChangeKeyboardVisible}
            />
          </SettingsRow>
        )}

        {/* Скользить пальцем не по чему, пока клавиатуры нет; значение хранится (OB-11). */}
        {keyboardShown && (
          <SettingsRow label={t('settings.glissando')}>
            <Toggle
              compact
              label={t('settings.glissando')}
              checked={glissando}
              onChange={onToggleGlissando}
            />
          </SettingsRow>
        )}

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
      </>
    )
  }

  function versionRows() {
    return (
      <>
        <SettingsRow label={t('settings.version')}>
          <span>{t('settings.build', { date: date(__BUILD_DATE__) })}</span>
          {updateReady && (
            <button type="button" className="button" onClick={onApplyUpdate}>
              {t('topbar.update')}
            </button>
          )}
        </SettingsRow>
      </>
    )
  }
}

export default SettingsScreen
