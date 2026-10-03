import type { RhythmSummary as Summary } from '../../engine/rhythm/session'
import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'
import Improvements from '../stats/Improvements'
import '../sequences/SessionSummary.css'
import './RhythmSummary.css'
import { useI18n } from '../i18n/useI18n'

interface Props {
  summary: Summary
  improvements: ImprovementsData
  onRepeat: () => void
  onNew: () => void
}

/** Итог «Ритма» (C-STF-6, OB-12) на месте стана — та же сетка, что у «Последовательностей». */
function RhythmSummary({ summary, improvements, onRepeat, onNew }: Props) {
  const { t, percent } = useI18n()
  return (
    <section className="summary summary--rhythm" aria-label={t('summary.label')}>
      <dl className="summary__counts">
        <div>
          <dt>{t('rsummary.cleanFirstTry')}</dt>
          <dd>{summary.cleanFirstTry}</dd>
        </div>
        <div>
          <dt>{t('stats.attempts')}</dt>
          <dd>{summary.attempts}</dd>
        </div>
        <div>
          <dt>{t('rsummary.onTime')}</dt>
          <dd>{summary.onTimeShare === null ? '—' : percent(summary.onTimeShare)}</dd>
        </div>
        <div>
          <dt>{t('rsummary.early')}</dt>
          <dd>{summary.early}</dd>
        </div>
        <div>
          <dt>{t('rsummary.late')}</dt>
          <dd>{summary.late}</dd>
        </div>
      </dl>
      <div className="summary__block summary__hard">
        <h3>{t('progress.list.figures')}</h3>
        {summary.hardest.length === 0 ? (
          <p>{summary.attempts === 0 ? t('rsummary.allSkipped') : t('rsummary.allClean')}</p>
        ) : (
          <ol>
            {summary.hardest.map(({ id, errors, attempts }) => (
              <li key={id}>
                <span className="summary__note">{t(`figure.${id}`)}</span> —{' '}
                {t('rsummary.errorOf', { errors, attempts })}
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

export default RhythmSummary
