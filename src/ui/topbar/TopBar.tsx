import type { ConnectionState } from '../../midi/types'
import { StatusIcon } from '../ConnectionStatus'
import { STATUS_TITLE, statusClass } from '../connectionTexts'
import { GearIcon, RefreshIcon } from '../icons/Icons'
import './TopBar.css'

interface Props {
  connectionState: ConnectionState
  /** Открыть «Настройки»: так же по статусу связи. */
  onOpenSettings: () => void
  /** Открыт сам экран «Настройки»: кнопка отмечена текущей и ничего не делает. */
  settingsOpen: boolean
  updateReady: boolean
  onApplyUpdate: () => void
}

/**
 * Верхняя панель — одна на все экраны (C-APP-1, OB-1). Слева статус связи, справа «Обновить»
 * (только когда ждёт новая версия) и «Настройки». Высота постоянная: ни состояние связи, ни
 * появление «Обновить» ничего не сдвигают.
 */
function TopBar({
  connectionState,
  onOpenSettings,
  settingsOpen,
  updateReady,
  onApplyUpdate,
}: Props) {
  const title = STATUS_TITLE[connectionState]
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <button
          type="button"
          className={`${statusClass(connectionState)} topbar__status`}
          aria-label={`${title}. Открыть настройки`}
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
            title="Обновить приложение"
            aria-label="Обновить приложение"
            onClick={onApplyUpdate}
          >
            <RefreshIcon />
            <span className="topbar__label">Обновить</span>
          </button>
          <button
            type="button"
            className="button topbar__button"
            aria-current={settingsOpen ? 'page' : undefined}
            title="Настройки"
            aria-label="Настройки"
            onClick={settingsOpen ? undefined : onOpenSettings}
          >
            <GearIcon />
            <span className="topbar__label">Настройки</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default TopBar
