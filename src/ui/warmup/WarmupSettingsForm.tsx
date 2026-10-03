import { describeNote } from '../../engine/noteEcho/describeNote'
import { TONALITIES, type Tonality } from '../../engine/warmup/keys'
import {
  BASS_LIMITS,
  MIN_RANGE_NOTES,
  TRAVEL_SECONDS_LIMITS,
  TREBLE_LIMITS,
  rangeExceedsCapacity,
  rangeNoteCount,
  type StepRange,
  type WarmupSettings,
} from '../../engine/warmup/settings'
import { naturalPitch, stepName } from '../../engine/warmup/steps'
import type { MessageKey } from '../../i18n'
import { ChoiceGroup, Dropdown, RangeSlider, Slider, Toggle } from '../controls/Controls'
import { useT } from '../i18n/useI18n'
import { WarningIcon } from '../icons/Icons'
import './WarmupSettingsForm.css'

interface Props {
  settings: WarmupSettings
  onChange: (settings: WarmupSettings) => void
  /**
   * Сколько белых клавиш видно на клавиатуре; null — клавиатуры нет (компактный экран): тогда
   * нет ни авто-сдвига, ни предупреждения о диапазоне (C-STF-9, OB-29).
   */
  capacity: number | null
}

/** «Mi · E3»: слоговое имя и буква с октавой, как на карточке нажатой ноты (C-STF-8). */
const noteTitle = (step: number) =>
  `${describeNote(naturalPitch(step)).solfege} · ${stepName(step)}`

/** Настройки режима «Разминка» на экране режима (меняют только черновик меню, C-STF-9). */
function WarmupSettingsForm({ settings, onChange, capacity }: Props) {
  const t = useT()
  const set = <K extends keyof WarmupSettings>(key: K, value: WarmupSettings[K]) =>
    onChange({ ...settings, [key]: value })

  const tonalityTitle = (tonality: Tonality) => {
    const name = t(`warmupform.key.${tonality.id}` as MessageKey)
    return tonality.signs === 0
      ? name
      : `${name} · ${tonality.signs}${tonality.kind === 'sharp' ? '♯' : '♭'}`
  }
  const hasSigns = TONALITIES.find((tonality) => tonality.id === settings.tonality)?.signs !== 0

  const rangeSlider = (
    label: MessageKey,
    range: StepRange,
    limits: StepRange,
    change: (range: StepRange) => void,
  ) => (
    <div className="warmup-range">
      <RangeSlider
        label={t(label)}
        low={range.low}
        high={range.high}
        min={limits.low}
        max={limits.high}
        gap={MIN_RANGE_NOTES - 1}
        describe={noteTitle}
        valueText={`${noteTitle(range.low)} – ${noteTitle(range.high)}, ${t('warmupform.noteCount', { n: rangeNoteCount(range) })}`}
        lowLabel={t('warmupform.low')}
        highLabel={t('warmupform.high')}
        onChange={change}
      />
      {rangeExceedsCapacity(range, capacity) && (
        // Только предупреждение: диапазон сохраняется и запускается как выбран (OB-27).
        <p className="warmup-warning" role="status">
          <WarningIcon />
          <span>{t('warmupform.rangeWarning')}</span>
        </p>
      )}
    </div>
  )

  return (
    <div className="warmup-settings">
      <Slider
        label={t('warmupform.travel')}
        value={settings.travelSeconds}
        {...TRAVEL_SECONDS_LIMITS}
        format={(value) => t('format.seconds', { value })}
        onChange={(value) => set('travelSeconds', value)}
      />
      <ChoiceGroup
        label={t('seqform.clef')}
        value={settings.clef}
        onChange={(value) => set('clef', value)}
        options={[
          { value: 'treble', title: t('seqform.clef.treble') },
          { value: 'bass', title: t('seqform.clef.bass') },
          { value: 'both', title: t('seqform.clef.both') },
        ]}
      />
      {settings.clef !== 'bass' &&
        rangeSlider('warmupform.trebleRange', settings.trebleRange, TREBLE_LIMITS, (range) =>
          set('trebleRange', range),
        )}
      {settings.clef !== 'treble' &&
        rangeSlider('warmupform.bassRange', settings.bassRange, BASS_LIMITS, (range) =>
          set('bassRange', range),
        )}
      <Dropdown
        label={t('warmupform.tonality')}
        value={settings.tonality}
        options={TONALITIES.map((tonality) => ({
          value: tonality.id,
          title: tonalityTitle(tonality),
        }))}
        onChange={(value) => set('tonality', value)}
      />
      <Toggle
        label={t('warmupform.naturals')}
        checked={settings.naturals}
        onChange={(value) => set('naturals', value)}
        disabled={!hasSigns}
        note={hasSigns ? undefined : t('warmupform.naturalsNote')}
      />
      {capacity !== null && (
        <Toggle
          label={t('warmupform.autoShift')}
          checked={settings.autoShift}
          onChange={(value) => set('autoShift', value)}
        />
      )}
    </div>
  )
}

export default WarmupSettingsForm
