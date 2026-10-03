import type {
  ImprovementLine,
  Improvements as ImprovementsData,
} from '../../engine/stats/improvements'
import { placeLabel } from '../i18n/places'
import { useI18n } from '../i18n/useI18n'

interface Props {
  improvements: ImprovementsData
  /** Тональность «Разминки»: по ней называются ноты со знаками. */
  tonality?: string
}

/** Блок «Что улучшилось» в итоге любого режима (C-STF-4, OB-11, OB-13, OB-14). */
function Improvements({ improvements, tonality }: Props) {
  const { t, percent, seconds } = useI18n()

  const lineText = ({ kind, key, metric, before, now }: ImprovementLine) =>
    metric === 'accuracy'
      ? t('improve.accuracy', {
          place: placeLabel(t, kind, key, tonality),
          before: percent(before),
          now: percent(now),
        })
      : t('improve.speed', {
          place: placeLabel(t, kind, key, tonality),
          before: seconds(before),
          now: seconds(now),
        })

  let content
  if (improvements.firstSession) {
    content = <p>{t('improve.first')}</p>
  } else if (improvements.lines.length === 0) {
    content = <p>{t('improve.none')}</p>
  } else {
    content = (
      <ul>
        {improvements.lines.map((line) => (
          <li key={`${line.kind}:${line.key}`}>{lineText(line)}</li>
        ))}
      </ul>
    )
  }
  return (
    <div className="summary__block summary__improved">
      <h3>{t('improve.title')}</h3>
      {content}
    </div>
  )
}

export default Improvements
