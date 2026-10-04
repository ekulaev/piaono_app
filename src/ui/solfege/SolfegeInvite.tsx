import '../stats/NoProgress.css'
import type { SolfegeModeId } from '../../engine/solfege/types'
import { useT } from '../i18n/useI18n'

/**
 * Приглашение режима сольфеджио (C-SOL-1, OB-19): пока статистики нет, вместо пустого стана —
 * что делает режим, одной фразой. «Старт» — на обычном месте в ряду кнопок.
 */
function SolfegeInvite({ mode }: { mode: SolfegeModeId }) {
  const t = useT()
  return (
    <div className="staff-zone">
      <p className="no-progress">{t(`solfege.invite.${mode}`)}</p>
    </div>
  )
}

export default SolfegeInvite
