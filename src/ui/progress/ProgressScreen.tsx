import { useState } from 'react'
import { MODES, modeInfo, type ModeId } from '../../engine/modes/modes'
import type { HintLevel, HintProgress } from '../../engine/sequences/hints'
import type { PracticeStats } from '../../engine/stats/stats'
import { summarizeMode, type HardPlace } from '../../engine/stats/summary'
import ConfirmDialog from '../ConfirmDialog'
import { ChoiceGroup } from '../controls/Controls'
import ScreenHeader from '../ScreenHeader'
import './ProgressScreen.css'

interface Props {
  /** Режим, открытый сначала; выбор на экране активный режим не меняет. */
  activeMode: ModeId
  practice: PracticeStats
  hints: HintProgress
  onResetStats: (mode: ModeId) => void
  onResetHints: () => void
  onBack: () => void
}

/** Уровень подсказок словами (C-STF-3, «Уровни подсказок»). */
const LEVEL_TEXT: Record<HintLevel, string> = {
  3: 'якорь с названием и все подсказки',
  2: 'якорь без названия и все подсказки',
  1: 'якорь и подсказка к первой ноте',
  0: 'без подсказок',
}

const percent = (share: number) => `${Math.round(share * 100)} %`
const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} с`

function placeLine(place: HardPlace) {
  const time = place.avgMs === null ? '' : `, ${seconds(place.avgMs)}`
  return `${place.attempts} попыток, ${percent(place.cleanShare)} чисто${time}`
}

type Confirm = 'stats' | 'hints' | null

/**
 * «Прогресс» (C-STF-7): что накоплено по режиму, трудные места — по той же трудности, по которой
 * тренажёр выбирает их чаще, — уровни подсказок и сброс с подтверждением.
 */
function ProgressScreen({
  activeMode,
  practice,
  hints,
  onResetStats,
  onResetHints,
  onBack,
}: Props) {
  const [mode, setMode] = useState<ModeId>(activeMode)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const summary = summarizeMode(mode, practice[mode])
  const title = modeInfo(mode).title
  const hintsToReturn = hints.treble.level < 3 || hints.bass.level < 3

  return (
    <main className="screen progress">
      <ScreenHeader title="Прогресс" onBack={onBack} />
      <div className="progress__content">
        <ChoiceGroup
          label="Режим"
          value={mode}
          onChange={setMode}
          options={MODES.map((m) => ({ value: m.id, title: m.title }))}
        />

        {summary ? (
          <>
            <dl className="progress__totals">
              <div>
                <dt>Попыток</dt>
                <dd>{summary.attempts}</dd>
              </div>
              <div>
                <dt>Чисто</dt>
                <dd>{percent(summary.cleanShare)}</dd>
              </div>
              {summary.avgMs !== null && (
                <div>
                  <dt>Среднее время</dt>
                  <dd>{seconds(summary.avgMs)}</dd>
                </div>
              )}
            </dl>
            <div className="progress__lists">
              {summary.lists.map((list) => (
                <section key={list.title} className="progress__list">
                  <h2>{list.title}</h2>
                  {list.places.length === 0 ? (
                    <p>Трудных мест пока нет</p>
                  ) : (
                    <ol>
                      {list.places.map((place) => (
                        <li key={place.label}>
                          <span className="progress__place">{place.label}</span> —{' '}
                          {placeLine(place)}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          <p className="progress__invite">
            Здесь появится, что даётся труднее. Сыграй первую сессию в этом режиме
          </p>
        )}

        <div className="progress__footer">
          {mode === 'sequences' && (
            <section className="progress__hints">
              <h2>Подсказки</h2>
              <p>
                Скрипичный: {hints.treble.level} из 3 — {LEVEL_TEXT[hints.treble.level]}
              </p>
              <p>
                Басовый: {hints.bass.level} из 3 — {LEVEL_TEXT[hints.bass.level]}
              </p>
            </section>
          )}

          <div className="progress__actions">
            {summary && (
              <button type="button" className="button" onClick={() => setConfirm('stats')}>
                Сбросить статистику
              </button>
            )}
            {mode === 'sequences' && hintsToReturn && (
              <button type="button" className="button" onClick={() => setConfirm('hints')}>
                Вернуть подсказки
              </button>
            )}
          </div>
        </div>
      </div>

      {confirm === 'stats' && (
        <ConfirmDialog
          question={`Стереть статистику «${title}»?`}
          details="Трудные места забудутся, тренажёр начнёт этот режим с чистого листа."
          onNo={() => setConfirm(null)}
          onYes={() => {
            onResetStats(mode)
            setConfirm(null)
          }}
        />
      )}
      {confirm === 'hints' && (
        <ConfirmDialog
          question="Вернуть все подсказки?"
          details="Якорь с названием и подсказки над всеми нотами снова будут показываться в обоих ключах."
          onNo={() => setConfirm(null)}
          onYes={() => {
            onResetHints()
            setConfirm(null)
          }}
        />
      )}
    </main>
  )
}

export default ProgressScreen
