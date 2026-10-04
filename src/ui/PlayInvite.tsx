import type { ConnectionState } from '../midi/types'
import { inviteKey } from './connectionTexts'
import { useT } from './i18n/useI18n'
import './PlayInvite.css'

interface Props {
  connectionState: ConnectionState
  /** Экран обычный: клавиатуру можно включить в «Настройках» — подсказываем второй строкой. */
  keyboardHintVisible: boolean
  onOpenSettings: () => void
}

/**
 * Приглашение, когда нечем играть: клавиатура не показана и пианино не на связи (C-APP-5).
 * Стоит в зоне нот и не двигает ряд кнопок; что сделать — одной строкой, кнопка ведёт в «Настройки».
 */
function PlayInvite({ connectionState, keyboardHintVisible, onOpenSettings }: Props) {
  const t = useT()
  const key = inviteKey(connectionState)
  if (!key) return null
  return (
    <div className="staff-zone">
      <div className="play-invite">
        <p className="play-invite__text" aria-live="polite">
          {t(key)}
        </p>
        {keyboardHintVisible && <p className="play-invite__hint">{t('invite.keyboardHint')}</p>}
        <button type="button" className="button" onClick={onOpenSettings}>
          {t('invite.settings')}
        </button>
      </div>
    </div>
  )
}

export default PlayInvite
