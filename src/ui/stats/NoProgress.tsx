import './NoProgress.css'

/**
 * «Ещё нет прогресса» (CLAUDE.md §8, C-STF-4 OB-16): вместо пустого стана — приглашение,
 * пока у активного режима нет ни одной записанной ноты.
 */
function NoProgress() {
  return (
    <div className="staff-zone">
      <p className="no-progress">
        Сыграй первую сессию — я запомню, какие ноты даются труднее, и буду чаще их показывать
      </p>
    </div>
  )
}

export default NoProgress
