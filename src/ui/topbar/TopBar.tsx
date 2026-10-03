import type { ConnectionState } from '../../midi/types'
import { StatusIcon } from '../ConnectionStatus'
import { STATUS_TITLE_KEY, statusClass } from '../connectionTexts'
import { GearIcon, ProgressIcon, RefreshIcon } from '../icons/Icons'
import LanguageMenu from './LanguageMenu'
import './TopBar.css'
import { useT } from '../i18n/useI18n'

interface Props {
  connectionState: ConnectionState
  /** Открыть «Настройки»: так же по статусу связи. */
  onOpenSettings: () => void
  onOpenProgress: () => void
  /** Какой экран панели открыт: его кнопка отмечена текущей и ничего не делает. */
  current: 'settings' | 'progress' | null
  updateReady: boolean
  onApplyUpdate: () => void
}

/**
 * Верхняя панель — одна на все экраны (C-APP-1, OB-1). Слева статус связи, справа «Обновить»
 * (только когда ждёт новая версия), «Прогресс», язык (C-APP-3) и «Настройки». Высота постоянная: ни состояние связи, ни
 * появление «Обновить» ничего не сдвигают.
 */
function TopBar({
  connectionState,
  onOpenSettings,
  onOpenProgress,
  current,
  updateReady,
  onApplyUpdate,
}: Props) {
  const t = useT()
  const settingsOpen = current === 'settings'
  const title = t(STATUS_TITLE_KEY[connectionState])
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <button
          type="button"
          className={`${statusClass(connectionState)} topbar__status`}
          aria-label={t('topbar.statusOpenSettings', { title })}
          onClick={settingsOpen ? undefined : onOpenSettings}
        >
          <StatusIcon />
          {/* Смена состояния объявляется диктором, как раньше у блока статуса. */}
          <span className="status__title" aria-live="polite">
            {title}
          </span>
        </button>
        <div className="topbar__actions">
          {/* Место «Обновить» есть всегда: появление кнопки не сдвигает «Настройки». */}
          <button
            type="button"
            className="button topbar__button"
            style={updateReady ? undefined : { visibility: 'hidden' }}
            aria-hidden={!updateReady}
            tabIndex={updateReady ? undefined : -1}
            title={t('topbar.updateApp')}
            aria-label={t('topbar.updateApp')}
            onClick={onApplyUpdate}
          >
            <RefreshIcon />
            <span className="topbar__label">{t('topbar.update')}</span>
          </button>
          <button
            type="button"
            className="button topbar__button"
            aria-current={current === 'progress' ? 'page' : undefined}
            title={t('topbar.progress')}
            aria-label={t('topbar.progress')}
            onClick={current === 'progress' ? undefined : onOpenProgress}
          >
            <ProgressIcon />
            <span className="topbar__label">{t('topbar.progress')}</span>
          </button>
          <LanguageMenu />
          <button
            type="button"
            className="button topbar__button"
            aria-current={settingsOpen ? 'page' : undefined}
            title={t('topbar.settings')}
            aria-label={t('topbar.settings')}
            onClick={settingsOpen ? undefined : onOpenSettings}
          >
            <GearIcon />
            <span className="topbar__label">{t('topbar.settings')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
