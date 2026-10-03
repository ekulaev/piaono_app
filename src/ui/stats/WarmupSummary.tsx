import type { WarmupSummary as Summary } from '../../engine/staff/exercise'
import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'
import { placeLabel } from '../i18n/places'
import Improvements from './Improvements'
import '../sequences/SessionSummary.css'
import { useI18n } from '../i18n/useI18n'

interface Props {
  summary: Summary
  improvements: ImprovementsData
}

/**
 * Итог «Разминки» после «Стопа» (C-STF-4, OB-12) — на месте стана. Своих кнопок нет:
 * новую сессию начинает «Старт» в ряду кнопок.
 */
function WarmupSummary({ summary, improvements }: Props) {
  const { t, percent, seconds } = useI18n()
  return (
    <section className="summary" aria-label={t('warmup.label')}>
      <dl className="summary__counts">
        <div>
          <dt>{t('warmup.clean')}</dt>
          <dd>{summary.clean}</dd>
        </div>
        <div>
          <dt>{t('warmup.errors')}</dt>
          <dd>{summary.errors}</dd>
        </div>
        <div>
          <dt>{t('warmup.missed')}</dt>
          <dd>{summary.missed}</dd>
        </div>
        <div>
          <dt>{t('summary.accuracy')}</dt>
          <dd>{percent(summary.accuracy)}</dd>
        </div>
      </dl>
      <div className="summary__block summary__slow">
        <h3>{t('summary.slowNotes')}</h3>
        {summary.slowest.length === 0 ? (
          <p>{t('warmup.noneClean')}</p>
        ) : (
          <ol>
            {summary.slowest.map(({ pitch, clef, averageMs }) => (
              <li key={`${clef}:${pitch}`}>
                <span className="summary__note">{placeLabel(t, 'note', `${clef}:${pitch}`)}</span> —{' '}
                {seconds(averageMs)}
              </li>
            ))}
          </ol>
        )}
      </div>
      <Improvements improvements={improvements} />
    </section>
  )
}

export default WarmupSummary
