import type { Improvements as ImprovementsData } from '../../engine/stats/improvements'

interface Props {
  improvements: ImprovementsData
}

/** Блок «Что улучшилось» в итоге любого режима (C-STF-4, OB-11, OB-13, OB-14). */
function Improvements({ improvements }: Props) {
  let content
  if (improvements.firstSession) {
    content = <p>Это первая сессия — в следующий раз покажу, что стало лучше</p>
  } else if (improvements.lines.length === 0) {
    content = <p>Заметных изменений пока нет — продолжай</p>
  } else {
    content = (
      <ul>
        {improvements.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    )
  }
  return (
    <div className="summary__block summary__improved">
      <h3>Что улучшилось</h3>
      {content}
    </div>
  )
}

export default Improvements
