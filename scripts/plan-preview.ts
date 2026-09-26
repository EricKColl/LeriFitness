/**
 * Herramienta de desarrollo: genera un plan de ejemplo y lo imprime en texto.
 *
 *   npx tsx scripts/plan-preview.ts [días] [minutos] [objetivo] [nivel] [material] [lesión:severidad,…]
 */
import catalogJson from '../src/data/generated/exercises.json'
import es from '../src/data/generated/exercises.es.json'
import {
  EQUIPMENT_PRESETS,
  ExerciseCatalogSchema,
  type EquipmentPreset,
  type Goal,
  type Injury,
  type InjurySeverity,
  type InjuryZone,
  type Level,
  type Weekday,
  DEFAULT_WEEKDAYS,
} from '../src/domain'
import { generatePlan } from '../src/engine'

const [
  days = '3',
  minutes = '60',
  goal = 'hypertrophy',
  level = 'intermediate',
  preset = 'fullGym',
  inj = '',
] = process.argv.slice(2)
const injuries: Injury[] = inj
  ? inj.split(',').map((s) => {
      const [zone, severity] = s.split(':')
      return { zone: zone as InjuryZone, severity: (severity ?? 'mild') as InjurySeverity }
    })
  : []
const names = es as Record<string, { name: string }>
const plan = generatePlan({
  catalog: ExerciseCatalogSchema.parse(catalogJson).exercises,
  profile: {
    sex: 'male',
    age: 32,
    heightCm: 178,
    weightKg: 78,
    job: 'sedentary',
    weekdays: DEFAULT_WEEKDAYS[Number(days)] as Weekday[],
    minutesPerSession: Number(minutes),
    equipment: [...EQUIPMENT_PRESETS[preset as EquipmentPreset]],
    level: level as Level,
    injuries,
    goal: goal as Goal,
  },
})
console.log(`Split ${plan.split} · ${plan.weekKind} · ${plan.energy.tdee} kcal`)
for (const day of plan.days) {
  console.log(`\n## ${day.id} (${day.estimatedMinutes} min)`)
  for (const p of day.prescriptions)
    console.log(
      `  ${p.role.padEnd(9)} ${names[p.exerciseId]?.name.padEnd(48)} ${p.sets}×${p.reps.min}-${p.reps.max}${p.unit === 'seconds' ? 's' : ''} RIR ${p.rir.min}-${p.rir.max} ${p.restSec}s${p.supersetWith ? ' [SS]' : ''}${p.substitutedFrom ? ` (sustituye ${p.substitutedFrom})` : ''}`,
    )
  if (day.conditioning)
    console.log(`  cardio: ${day.conditioning.exerciseId} ${day.conditioning.minutes} min`)
}
console.log('\nVolumen:')
for (const [m, v] of Object.entries(plan.volume))
  if (v.planned || v.target)
    console.log(`  ${m.padEnd(11)} ${v.planned} / objetivo ${v.target} [${v.min}-${v.max}]`)
console.log(
  '\nRazones:',
  plan.reasons.map((r) => r.key + (r.params ? JSON.stringify(r.params) : '')).join('\n  '),
)
console.log(
  'Avisos:',
  plan.warnings.map((r) => r.key + (r.params ? JSON.stringify(r.params) : '')).join(' | '),
)
