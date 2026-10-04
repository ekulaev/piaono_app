import type { LegendLabel } from '../keyboard/Keyboard'
import { LegendText } from '../keyboard/Keyboard'
import { legendRowItems } from './legendRow'
import './LegendRow.css'

interface Props {
  labels: Readonly<Record<number, LegendLabel>>
}

/**
 * Легенда без экранной клавиатуры (C-APP-5, OB-17): рядом «клавиша — значение», целиком, без
 * прокрутки; переносится на строки, а не уменьшается. Ученик ищет клавишу на пианино.
 */
function LegendRow({ labels }: Props) {
  return (
    <ul className="legend-row">
      {legendRowItems(labels).map((item) => (
        <li key={item.pitchClass} className="legend-row__item">
          <span className="legend-row__key">{item.name}</span>
          <span aria-hidden="true">—</span>
          <span className="legend-row__value">
            <LegendText label={item.label} />
          </span>
        </li>
      ))}
    </ul>
  )
}

export default LegendRow
