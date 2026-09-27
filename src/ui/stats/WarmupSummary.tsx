import type { WarmupSummary as Summary } from '../../engine/staff/exercise'
import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'
import { pitchToNoteName } from '../../midi/noteNames'
import Improvements from './Improvements'
import '../sequences/SessionSummary.css'

interface Props {
  summary: Summary
  improvements: ImprovementsData
}

const seconds = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',')

/**
 * Итог «Разминки» после «Стопа» (C-STF-4, OB-12) — на месте стана. Своих кнопок нет:
 * новую сессию начинает «Старт» в ряду кнопок.
 */
function WarmupSummary({ summary, improvements }: Props) {
  return (
    <section className="summary" aria-label="Итог разминки">
      <dl className="summary__counts">
        <div>
          <dt>Верно сразу</dt>
          <dd>{summary.clean}</dd>
        </div>
        <div>
          <dt>После ошибки</dt>
          <dd>{summary.errors}</dd>
        </div>
        <div>
          <dt>Не успел</dt>
          <dd>{summary.missed}</dd>
        </div>
        <div>
          <dt>Точность</dt>
          <dd>{Math.round(summary.accuracy * 100)} %</dd>
        </div>
      </dl>
      <div className="summary__block summary__slow">
        <h3>Самые медленные ноты</h3>
        {summary.slowest.length === 0 ? (
          <p>Верных с первой попытки нет</p>
        ) : (
          <ol>
            {summary.slowest.map(({ pitch, clef, averageMs }) => (
              <li key={`${clef}:${pitch}`}>
                <span className="summary__note">
                  {pitchToNoteName(pitch)}
                  {clef === 'bass' ? ' (бас)' : ''}
                </span>{' '}
                — {seconds(averageMs)} с
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
