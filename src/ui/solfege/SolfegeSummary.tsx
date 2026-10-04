import type { SolfegeSummary as Summary } from '../../engine/solfege/session'
import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'
import Improvements from '../stats/Improvements'
import { taskLabel } from '../i18n/places'
import '../sequences/SessionSummary.css'
import './SolfegeSummary.css'
import { useI18n } from '../i18n/useI18n'

interface Props {
  summary: Summary
  improvements: ImprovementsData
  onRepeat: () => void
  onNew: () => void
}

/**
 * Итог сессии сольфеджио (C-SOL-1, OB-18) на месте стана — та же сетка, что у
 * «Последовательностей»: исходы, трудные задания словами режима, «Что улучшилось», кнопки.
 */
function SolfegeSummary({ summary, improvements, onRepeat, onNew }: Props) {
  const { t } = useI18n()
  return (
    <section className="summary summary--solfege" aria-label={t('summary.label')}>
      <dl className="summary__counts">
        <div>
          <dt>{t('summary.correctFirstTry')}</dt>
          <dd>{summary.clean}</dd>
        </div>
        <div>
          <dt>{t('summary.withError')}</dt>
          <dd>{summary.withError}</dd>
        </div>
        <div>
          <dt>{t('summary.skipped')}</dt>
          <dd>{summary.skipped}</dd>
        </div>
      </dl>
      <div className="summary__block summary__hard">
        <h3>{t('progress.list.tasks')}</h3>
        {summary.hardTypes.length === 0 ? (
          <p>{t('ssummary.allClean')}</p>
        ) : (
          <ol>
            {summary.hardTypes.map((type) => (
              <li key={type}>
                <span className="summary__note">{taskLabel(t, type)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="summary__side">
        <Improvements improvements={improvements} />
        <div className="summary__actions">
          <button type="button" className="button" onClick={onRepeat}>
            {t('summary.repeat')}
          </button>
          <button type="button" className="button button--primary" onClick={onNew}>
            {t('summary.new')}
          </button>
        </div>
      </div>
    </section>
  )
}

export default SolfegeSummary
