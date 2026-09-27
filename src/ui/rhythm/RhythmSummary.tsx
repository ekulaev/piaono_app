import type { RhythmSummary as Summary } from '../../engine/rhythm/session'
import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'
import Improvements from '../stats/Improvements'
import '../sequences/SessionSummary.css'
import './RhythmSummary.css'

interface Props {
  summary: Summary
  improvements: ImprovementsData
  onRepeat: () => void
  onNew: () => void
}

/** Итог «Ритма» (C-STF-6, OB-12) на месте стана — та же сетка, что у «Последовательностей». */
function RhythmSummary({ summary, improvements, onRepeat, onNew }: Props) {
  return (
    <section className="summary summary--rhythm" aria-label="Итог сессии">
      <dl className="summary__counts">
        <div>
          <dt>Чисто сразу</dt>
          <dd>{summary.cleanFirstTry}</dd>
        </div>
        <div>
          <dt>Попыток</dt>
          <dd>{summary.attempts}</dd>
        </div>
        <div>
          <dt>Вовремя</dt>
          <dd>
            {summary.onTimeShare === null ? '—' : `${Math.round(summary.onTimeShare * 100)} %`}
          </dd>
        </div>
        <div>
          <dt>Рано</dt>
          <dd>{summary.early}</dd>
        </div>
        <div>
          <dt>Поздно</dt>
          <dd>{summary.late}</dd>
        </div>
      </dl>
      <div className="summary__block summary__hard">
        <h3>Трудные фигуры</h3>
        {summary.hardest.length === 0 ? (
          <p>{summary.attempts === 0 ? 'Все рисунки пропущены' : 'Все фигуры сыграны чисто'}</p>
        ) : (
          <ol>
            {summary.hardest.map(({ label, errors, attempts }) => (
              <li key={label}>
                <span className="summary__note">{label}</span> — {errors} из {attempts} с ошибкой
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

export default RhythmSummary
