/**
 * Campos del perfil, compartidos por el onboarding y la edición del perfil.
 */
import { useState } from 'react'
import {
  Armchair,
  ChevronDown,
  Dumbbell,
  Footprints,
  HardHat,
  Home,
  Mountain,
  PersonStanding,
  Sprout,
  Trophy,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import {
  EQUIPMENT_PRESETS,
  GOALS,
  INJURY_SEVERITIES,
  INJURY_ZONES,
  JOB_TYPES,
  LEVELS,
  MAX_SESSION_MINUTES,
  MAX_TRAINING_DAYS,
  MIN_SESSION_MINUTES,
  USER_EQUIPMENT,
  WEEKDAYS,
  type EquipmentPreset,
  type Goal,
  type Injury,
  type JobType,
  type Level,
  type UserEquipment,
  type Weekday,
} from '@/domain'
import { cn } from '@/shared/lib/utils'
import { GOAL_ICONS } from '@/shared/ui/icons'
import { Chip, FieldLabel, OptionCard, Segmented } from '@/shared/ui/fields'
import { Slider } from '@/shared/ui/slider'

const LEVEL_ICONS: Record<Level, LucideIcon> = {
  beginner: Sprout,
  intermediate: Mountain,
  advanced: Trophy,
}

const JOB_ICONS: Record<JobType, LucideIcon> = {
  sedentary: Armchair,
  active: Footprints,
  physical: HardHat,
}

const PRESET_ICONS: Record<EquipmentPreset, LucideIcon> = {
  fullGym: Warehouse,
  homeDumbbells: Dumbbell,
  homeBasic: Home,
  bodyweight: PersonStanding,
}

export function GoalPicker({ value, onChange }: { value?: Goal; onChange: (g: Goal) => void }) {
  const { t } = useTranslation('domain')
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {GOALS.map((goal) => {
        const Icon = GOAL_ICONS[goal]
        return (
          <OptionCard
            key={goal}
            selected={value === goal}
            onSelect={() => onChange(goal)}
            icon={<Icon />}
            title={t(`goals.${goal}`)}
            description={t(`goalHints.${goal}`)}
          />
        )
      })}
    </div>
  )
}

export function LevelPicker({ value, onChange }: { value?: Level; onChange: (l: Level) => void }) {
  const { t } = useTranslation('domain')
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {LEVELS.map((level) => {
        const Icon = LEVEL_ICONS[level]
        return (
          <OptionCard
            key={level}
            selected={value === level}
            onSelect={() => onChange(level)}
            icon={<Icon />}
            title={t(`levels.${level}`)}
            description={t(`levelHints.${level}`)}
          />
        )
      })}
    </div>
  )
}

export function JobPicker({
  value,
  onChange,
}: {
  value?: JobType
  onChange: (j: JobType) => void
}) {
  const { t } = useTranslation('domain')
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {JOB_TYPES.map((job) => {
        const Icon = JOB_ICONS[job]
        return (
          <OptionCard
            key={job}
            selected={value === job}
            onSelect={() => onChange(job)}
            icon={<Icon />}
            title={t(`jobs.${job}`)}
            description={t(`jobHints.${job}`)}
          />
        )
      })}
    </div>
  )
}

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: Weekday[]
  onChange: (days: Weekday[]) => void
}) {
  const { t } = useTranslation()
  const short = t('weekdays.short', { returnObjects: true })
  const long = t('weekdays.long', { returnObjects: true })
  const full = value.length >= MAX_TRAINING_DAYS
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEKDAYS.map((day) => {
        const selected = value.includes(day)
        return (
          <Chip
            key={day}
            selected={selected}
            disabled={!selected && full}
            aria-label={long[day]}
            onClick={() =>
              onChange(
                selected ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b),
              )
            }
            className="h-12 min-w-0 px-0 text-base"
          >
            {short[day]}
          </Chip>
        )
      })}
    </div>
  )
}

export function MinutesSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (m: number) => void
}) {
  const { t } = useTranslation('onboarding')
  return (
    <div>
      <p className="mb-1 font-display text-4xl font-extrabold tabular-nums">
        {t('availability.minutesValue', { count: value })}
      </p>
      <Slider
        value={[value]}
        min={MIN_SESSION_MINUTES}
        max={MAX_SESSION_MINUTES}
        step={5}
        onValueChange={([v]) => v !== undefined && onChange(v)}
        aria-label={t('availability.minutes')}
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{MIN_SESSION_MINUTES}</span>
        <span>60</span>
        <span>90</span>
        <span>{MAX_SESSION_MINUTES}</span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t('availability.minutesHint')}</p>
    </div>
  )
}

function presetOf(equipment: readonly UserEquipment[]): EquipmentPreset | null {
  const set = new Set(equipment)
  for (const [preset, items] of Object.entries(EQUIPMENT_PRESETS) as [
    EquipmentPreset,
    readonly UserEquipment[],
  ][]) {
    if (items.length === set.size && items.every((i) => set.has(i))) return preset
  }
  return null
}

export function EquipmentPicker({
  value,
  onChange,
}: {
  value: UserEquipment[]
  onChange: (items: UserEquipment[]) => void
}) {
  const { t } = useTranslation(['domain', 'onboarding'])
  const preset = presetOf(value)
  const [custom, setCustom] = useState(preset === null)
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" className="flex flex-col gap-3">
        {(Object.keys(EQUIPMENT_PRESETS) as EquipmentPreset[]).map((p) => {
          const Icon = PRESET_ICONS[p]
          return (
            <OptionCard
              key={p}
              selected={preset === p}
              onSelect={() => onChange([...EQUIPMENT_PRESETS[p]])}
              icon={<Icon />}
              title={t(`domain:equipmentPresets.${p}`)}
              description={t(`domain:equipmentPresetHints.${p}`)}
            />
          )
        })}
      </div>
      <button
        type="button"
        aria-expanded={custom}
        onClick={() => setCustom(!custom)}
        className="flex min-h-11 items-center justify-between rounded-2xl px-1 text-sm font-semibold text-primary"
      >
        {t('onboarding:equipment.custom')}
        <ChevronDown className={cn('size-5 transition-transform', custom && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {custom && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="mb-3 text-sm text-muted-foreground">
              {t('onboarding:equipment.customHint')}
            </p>
            <div className="flex flex-wrap gap-2">
              {USER_EQUIPMENT.map((item) => {
                const selected = value.includes(item)
                return (
                  <Chip
                    key={item}
                    selected={selected}
                    onClick={() =>
                      onChange(selected ? value.filter((i) => i !== item) : [...value, item])
                    }
                  >
                    {t(`domain:equipment.${item}`)}
                  </Chip>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function InjuryPicker({
  value,
  onChange,
}: {
  value: Injury[]
  onChange: (injuries: Injury[]) => void
}) {
  const { t } = useTranslation(['domain', 'onboarding'])
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        {INJURY_ZONES.map((zone) => {
          const selected = value.some((i) => i.zone === zone)
          return (
            <Chip
              key={zone}
              selected={selected}
              onClick={() =>
                onChange(
                  selected
                    ? value.filter((i) => i.zone !== zone)
                    : [...value, { zone, severity: 'mild' }],
                )
              }
            >
              {t(`domain:injuryZones.${zone}`)}
            </Chip>
          )
        })}
      </div>
      <AnimatePresence initial={false}>
        {value.map((injury) => (
          <motion.div
            key={injury.zone}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="surface p-4"
          >
            <FieldLabel>
              {t(`domain:injuryZones.${injury.zone}`)} · {t('onboarding:injuries.severity')}
            </FieldLabel>
            <Segmented
              label={t(`domain:injuryZones.${injury.zone}`)}
              value={injury.severity}
              onChange={(severity) =>
                onChange(value.map((i) => (i.zone === injury.zone ? { ...i, severity } : i)))
              }
              options={INJURY_SEVERITIES.map((s) => ({
                value: s,
                label: t(`domain:severities.${s}`),
              }))}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {t(`domain:severityHints.${injury.severity}`)}
            </p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
