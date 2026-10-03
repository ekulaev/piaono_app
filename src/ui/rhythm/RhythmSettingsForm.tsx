import { LEVELS, type RhythmLevel } from '../../engine/rhythm/figures'
import type { Meter } from '../../engine/rhythm/generate'
import {
  BAR_CHOICES,
  LEVEL_CHOICES,
  METER_CHOICES,
  PATTERNS_LIMITS,
  type RhythmSettings,
} from '../../engine/rhythm/settings'
import { ChoiceGroup, Stepper } from '../controls/Controls'
import { useT } from '../i18n/useI18n'
import type { MessageKey } from '../../i18n'

interface Props {
  settings: RhythmSettings
  onChange: (settings: RhythmSettings) => void
}

/** Что входит в уровень — словами, под кнопками уровней. */
function levelNote(level: RhythmLevel, t: (key: MessageKey) => string): string {
  const names = LEVELS[level].map((id) => t(`figure.${id}`))
  return names.join(', ').replace(/^./, (first) => first.toUpperCase())
}

/**
 * Настройки режима «Ритм» (C-STF-6, OB-2). Флажка «Переключать автоматически» нет: после
 * рисунка ученик сам выбирает, повторить или идти дальше.
 */
function RhythmSettingsForm({ settings, onChange }: Props) {
  const t = useT()
  const set = <K extends keyof RhythmSettings>(key: K, value: RhythmSettings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="sequence-settings">
      <ChoiceGroup
        label={t('rhythmform.level')}
        value={String(settings.level)}
        onChange={(value) => set('level', Number(value) as RhythmLevel)}
        options={LEVEL_CHOICES.map((level) => ({ value: String(level), title: String(level) }))}
        note={levelNote(settings.level, t)}
      />
      <ChoiceGroup
        label={t('rhythmform.meter')}
        value={String(settings.meter)}
        onChange={(value) => set('meter', Number(value) as Meter)}
        options={METER_CHOICES.map((meter) => ({ value: String(meter), title: `${meter}/4` }))}
      />
      <ChoiceGroup
        label={t('rhythmform.bars')}
        value={String(settings.bars)}
        onChange={(value) => set('bars', Number(value) as 1 | 2)}
        options={BAR_CHOICES.map((bars) => ({ value: String(bars), title: String(bars) }))}
      />
      <Stepper
        label={t('rhythmform.patterns')}
        value={settings.patterns}
        {...PATTERNS_LIMITS}
        onChange={(value) => set('patterns', value)}
      />
    </div>
  )
}

export default RhythmSettingsForm
