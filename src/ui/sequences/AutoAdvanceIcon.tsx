/**
 * Значок «Переключать автоматически»: два треугольника и черта — «дальше, до следующей».
 * Сплошные фигуры без тонких линий; смысл дублирует подпись (в меню) или aria-label.
 */
function AutoAdvanceIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="2,4 11,12 2,20" />
      <polygon points="11,4 20,12 11,20" />
      <rect x="19" y="4" width="3.5" height="16" />
    </svg>
  )
}

export default AutoAdvanceIcon
