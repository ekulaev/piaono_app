import { MAX_INTERVAL, widestFitting } from '../../engine/sequences/anchors'
import { RANGES } from '../../engine/sequences/generate'
import {
  NOTES_PER_STEP_LIMITS,
  SEQUENCES_LIMITS,
  type SequenceSettings,
} from '../../engine/sequences/settings'
import { ChoiceGroup, Stepper, Toggle } from '../controls/Controls'
import AutoAdvanceIcon from './AutoAdvanceIcon'
import { useT } from '../i18n/useI18n'
import type { MessageKey } from '../../i18n'

type T = (key: MessageKey, params?: Record<string, string | number>) => string

interface Props {
  settings: SequenceSettings
  onChange: (settings: SequenceSettings) => void
  /** «Контур»: шаги всегда одиночные, подсказок нет — этих настроек нет (C-STF-5, OB-2). */
  variant?: 'sequences' | 'contour'
}

/**
 * «В этом диапазоне — не больше …», если выбранный предел шире диапазона. Число белых клавиш
 * у скрипичного и басового диапазона одно, поэтому достаточно скрипичного.
 */
function intervalNote(settings: SequenceSettings, t: T): string | undefined {
  const { low, high } = RANGES[settings.range].treble
  const widest = widestFitting(low, high, settings.intervals)
  return widest < MAX_INTERVAL[settings.intervals]
    ? t('seqform.rangeLimit', { name: t(`interval.name.${widest}` as MessageKey) })
    : undefined
}

/** Настройки режима «Последовательности» на экране режима (меняют только черновик). */
function SequenceSettingsForm({ settings, onChange, variant = 'sequences' }: Props) {
  const t = useT()
  const contour = variant === 'contour'
  const set = <K extends keyof SequenceSettings>(key: K, value: SequenceSettings[K]) =>
    onChange({ ...settings, [key]: value })
  // Подсказки и интервалы — только для шагов из одной ноты (C-STF-3, OB-8).
  const chords = !contour && settings.notesPerStep > 1

  return (
    <div className="sequence-settings">
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
      <ChoiceGroup
        label={t('seqform.range')}
        value={settings.range}
        onChange={(value) => set('range', value)}
        options={[
          { value: 'position', title: t('seqform.range.position') },
          { value: 'octave', title: t('seqform.range.octave') },
          { value: 'staff', title: t('seqform.range.staff') },
        ]}
      />
      <ChoiceGroup
        label={t('seqform.intervals')}
        value={settings.intervals}
        onChange={(value) => set('intervals', value)}
        options={[
          { value: 'third', title: t('seqform.intervals.third') },
          { value: 'fifth', title: t('seqform.intervals.fifth') },
          { value: 'octave', title: t('seqform.intervals.octave') },
        ]}
        disabled={chords}
        note={chords ? t('seqform.singleNotesOnly') : intervalNote(settings, t)}
      />
      <Stepper
        label={t('seqform.sequences')}
        value={settings.sequences}
        {...SEQUENCES_LIMITS}
        onChange={(value) => set('sequences', value)}
      />
      {!contour && (
        <Stepper
          label={t('seqform.notesPerStep')}
          value={settings.notesPerStep}
          {...NOTES_PER_STEP_LIMITS}
          onChange={(value) => set('notesPerStep', value)}
        />
      )}
      {!contour && (
        <Toggle
          label={t('seqform.hints')}
          checked={settings.hints}
          onChange={(value) => set('hints', value)}
          disabled={chords}
          note={chords ? t('seqform.singleNotesOnly') : undefined}
        />
      )}
      <Toggle
        label={t('modeControl.autoAdvance')}
        checked={settings.autoAdvance}
        onChange={(value) => set('autoAdvance', value)}
        icon={<AutoAdvanceIcon />}
      />
    </div>
  )
}

export default SequenceSettingsForm
