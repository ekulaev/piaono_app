import './NoProgress.css'
import { useT } from '../i18n/useI18n'

/**
 * «Ещё нет прогресса» (CLAUDE.md §8, C-STF-4 OB-16): вместо пустого стана — приглашение,
 * пока у активного режима нет ни одной записанной ноты.
 */
function NoProgress() {
  const t = useT()
  return (
    <div className="staff-zone">
      <p className="no-progress">{t('noProgress.text')}</p>
    </div>
  )
}

export default NoProgress
