import { pitchToNoteName } from '../../midi/noteNames'
import type { SessionSummary as Summary } from '../../engine/sequences/session'
import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'
import Improvements from '../stats/Improvements'
import './SessionSummary.css'

interface Props {
  summary: Summary
  improvements: ImprovementsData
  onRepeat: () => void
  onNew: () => void
}

const seconds = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',')

/** Итог сессии на месте нотного стана — не поверх экрана. */
function SessionSummary({ summary, improvements, onRepeat, onNew }: Props) {
  return (
    <section className="summary" aria-label="Итог сессии">
      <dl className="summary__counts">
        <div>
          <dt>Верно с первой попытки</dt>
          <dd>{summary.correctFirstTry}</dd>
        </div>
        <div>
          <dt>С ошибкой</dt>
          <dd>{summary.withError}</dd>
        </div>
        <div>
          <dt>Пропущено</dt>
          <dd>{summary.skipped}</dd>
        </div>
        <div>
          <dt>Точность</dt>
          <dd>{summary.accuracy === null ? '—' : `${Math.round(summary.accuracy * 100)} %`}</dd>
        </div>
        {summary.withoutHint && (
          <div>
            <dt>Без подсказки</dt>
            <dd>
              {summary.withoutHint.of === 0
                ? '—'
                : `${summary.withoutHint.count} из ${summary.withoutHint.of}`}
            </dd>
          </div>
        )}
      </dl>
      <div className="summary__block summary__slow">
        <h3>Самые медленные ноты</h3>
        {summary.slowest.length === 0 ? (
          <p>Все шаги пропущены</p>
        ) : (
          <ol>
            {summary.slowest.map(({ pitch, averageMs }) => (
              <li key={pitch}>
                <span className="summary__note">{pitchToNoteName(pitch)}</span> —{' '}
                {seconds(averageMs)} с
              </li>
            ))}
          </ol>
        )}
      </div>
      <div className="summary__side">
        <Improvements improvements={improvements} />
        <div className="summary__actions">
          <button type="button" className="button" onClick={onRepeat}>
            Повторить
          </button>
          <button type="button" className="button button--primary" onClick={onNew}>
            Новая
          </button>
        </div>
      </div>
    </section>
  )
}

export default SessionSummary
