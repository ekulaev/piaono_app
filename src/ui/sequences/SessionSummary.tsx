import type { SessionSummary as Summary } from '../../engine/sequences/session'
import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'
import Improvements from '../stats/Improvements'
import './SessionSummary.css'
import { useI18n } from '../i18n/useI18n'

interface Props {
  summary: Summary
  improvements: ImprovementsData
  /** «Контур» показывает медленные переходы, а не ноты (C-STF-5, OB-14). */
  contour?: boolean
  onRepeat: () => void
  onNew: () => void
}

/** Итог сессии на месте нотного стана — не поверх экрана. */
function SessionSummary({ summary, improvements, contour = false, onRepeat, onNew }: Props) {
  const { t, percent, seconds } = useI18n()
  return (
    <section className="summary" aria-label={t('summary.label')}>
      <dl className="summary__counts">
        <div>
          <dt>{t('summary.correctFirstTry')}</dt>
          <dd>{summary.correctFirstTry}</dd>
        </div>
        <div>
          <dt>{t('summary.withError')}</dt>
          <dd>{summary.withError}</dd>
        </div>
        <div>
          <dt>{t('summary.skipped')}</dt>
          <dd>{summary.skipped}</dd>
        </div>
        <div>
          <dt>{t('summary.accuracy')}</dt>
          <dd>{summary.accuracy === null ? '—' : percent(summary.accuracy)}</dd>
        </div>
        {summary.withoutHint && (
          <div>
            <dt>{t('summary.withoutHint')}</dt>
            <dd>
              {summary.withoutHint.of === 0
                ? '—'
                : t('summary.outOf', {
                    count: summary.withoutHint.count,
                    of: summary.withoutHint.of,
                  })}
            </dd>
          </div>
        )}
      </dl>
      <div className="summary__block summary__slow">
        <h3>{contour ? t('summary.slowTransitions') : t('summary.slowNotes')}</h3>
        {summary.slowest.length === 0 ? (
          <p>{contour ? t('summary.noTransitions') : t('summary.allSkipped')}</p>
        ) : (
          <ol>
            {summary.slowest.map(({ label, averageMs }) => (
              <li key={label}>
                <span className="summary__note">{label}</span> — {seconds(averageMs)}
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

export default SessionSummary
