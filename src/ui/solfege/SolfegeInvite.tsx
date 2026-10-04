import '../stats/NoProgress.css'
import { useT } from '../i18n/useI18n'

/**
 * Приглашение режима сольфеджио (C-SOL-1, OB-19): пока статистики нет, вместо пустого стана —
 * что делает режим, одной фразой. «Старт» — на обычном месте в ряду кнопок.
 */
function SolfegeInvite() {
  const t = useT()
  return (
    <div className="staff-zone">
      <p className="no-progress">{t('solfege.invite.intervals')}</p>
    </div>
  )
}

export default SolfegeInvite
