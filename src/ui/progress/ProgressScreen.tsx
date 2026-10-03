import { useState } from 'react'
import { MODES, type ModeId } from '../../engine/modes/modes'
import type { HintProgress } from '../../engine/sequences/hints'
import type { PracticeStats } from '../../engine/stats/stats'
import { summarizeMode, type HardPlace } from '../../engine/stats/summary'
import ConfirmDialog from '../ConfirmDialog'
import { ChoiceGroup } from '../controls/Controls'
import ScreenHeader from '../ScreenHeader'
import './ProgressScreen.css'
import { placeLabel } from '../i18n/places'
import { useI18n } from '../i18n/useI18n'

interface Props {
  /** Режим, открытый сначала; выбор на экране активный режим не меняет. */
  activeMode: ModeId
  practice: PracticeStats
  hints: HintProgress
  /** Тональность «Разминки»: по ней называются ноты со знаками в её трудных местах. */
  warmupTonality: string
  onResetStats: (mode: ModeId) => void
  onResetHints: () => void
  onBack: () => void
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
  warmupTonality,
  onResetStats,
  onResetHints,
  onBack,
}: Props) {
  const [mode, setMode] = useState<ModeId>(activeMode)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const { t, percent, seconds } = useI18n()
  const summary = summarizeMode(mode, practice[mode])
  const title = t(`mode.${mode}`)

  /** «5 попыток, 58 % чисто, 2,1 с» — разделитель одинаков на всех языках. */
  function placeLine(place: HardPlace) {
    const parts = [
      t('progress.attemptsCount', { n: place.attempts }),
      t('progress.cleanShare', { share: percent(place.cleanShare) }),
    ]
    if (place.avgMs !== null) parts.push(seconds(place.avgMs))
    return parts.join(', ')
  }
  const hintsToReturn = hints.treble.level < 3 || hints.bass.level < 3

  return (
    <main className="screen progress">
      <ScreenHeader title={t('topbar.progress')} onBack={onBack} />
      <div className="progress__content">
        <ChoiceGroup
          label={t('progress.mode')}
          value={mode}
          onChange={setMode}
          options={MODES.map((m) => ({ value: m.id, title: t(`mode.${m.id}`) }))}
        />

        {summary ? (
          <>
            <dl className="progress__totals">
              <div>
                <dt>{t('stats.attempts')}</dt>
                <dd>{summary.attempts}</dd>
              </div>
              <div>
                <dt>{t('progress.clean')}</dt>
                <dd>{percent(summary.cleanShare)}</dd>
              </div>
              {summary.avgMs !== null && (
                <div>
                  <dt>{t('progress.avgTime')}</dt>
                  <dd>{seconds(summary.avgMs)}</dd>
                </div>
              )}
            </dl>
            <div className="progress__lists">
              {summary.lists.map((list) => (
                <section key={list.id} className="progress__list">
                  <h2>{t(`progress.list.${list.id}`)}</h2>
                  {list.places.length === 0 ? (
                    <p>{t('progress.noHard')}</p>
                  ) : (
                    <ol>
                      {list.places.map((place) => (
                        <li key={`${place.kind}:${place.key}`}>
                          <span className="progress__place">
                            {placeLabel(
                              t,
                              place.kind,
                              place.key,
                              mode === 'warmup' ? warmupTonality : undefined,
                            )}
                          </span>{' '}
                          — {placeLine(place)}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          <p className="progress__invite">{t('progress.invite')}</p>
        )}

        <div className="progress__footer">
          {mode === 'sequences' && (
            <section className="progress__hints">
              <h2>{t('progress.hints')}</h2>
              <p>
                {t('progress.hintsLine', {
                  clef: t('seqform.clef.treble'),
                  level: hints.treble.level,
                  text: t(`progress.level.${hints.treble.level}`),
                })}
              </p>
              <p>
                {t('progress.hintsLine', {
                  clef: t('seqform.clef.bass'),
                  level: hints.bass.level,
                  text: t(`progress.level.${hints.bass.level}`),
                })}
              </p>
            </section>
          )}

          <div className="progress__actions">
            {summary && (
              <button type="button" className="button" onClick={() => setConfirm('stats')}>
                {t('progress.resetStats')}
              </button>
            )}
            {mode === 'sequences' && hintsToReturn && (
              <button type="button" className="button" onClick={() => setConfirm('hints')}>
                {t('progress.restoreHints')}
              </button>
            )}
          </div>
        </div>
      </div>

      {confirm === 'stats' && (
        <ConfirmDialog
          question={t('progress.confirmStats', { mode: title })}
          details={t('progress.confirmStatsDetails')}
          onNo={() => setConfirm(null)}
          onYes={() => {
            onResetStats(mode)
            setConfirm(null)
          }}
        />
      )}
      {confirm === 'hints' && (
        <ConfirmDialog
          question={t('progress.confirmHints')}
          details={t('progress.confirmHintsDetails')}
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
