/**
 * Selección de ejercicios por hueco: filtra por material, lesiones, nivel y categoría, y puntúa
 * por preferencia curada (staple), encaje con objetivo y nivel, variante y variedad.
 * Todo es determinista: los empates se resuelven por id.
 */
import {
  hasEquipment,
  isContraindicated,
  LEVEL_RANK,
  STRENGTH_PATTERNS,
  type Equipment,
  type Exercise,
  type Goal,
  type Injury,
  type Level,
  type Pattern,
} from '@/domain'

import { isLoadable } from './progression'
import type { SlotDef, Variant } from './templates'
import type { SlotRole } from './types'

export interface SelectionContext {
  goal: Goal
  level: Level
  equipment: ReadonlySet<Equipment>
  injuries: readonly Injury[]
}

/** ¿Se puede hacer este ejercicio con este material y estas lesiones? */
export function isSafeAndAvailable(exercise: Exercise, ctx: SelectionContext) {
  if (!hasEquipment(exercise.equipment, ctx.equipment)) return false
  return !ctx.injuries.some((injury) =>
    isContraindicated(exercise.jointStress[injury.zone], injury.severity),
  )
}

/** Ejercicio de fuerza programable por el motor. */
export function isProgrammable(exercise: Exercise) {
  return (
    exercise.staple > 0 &&
    (exercise.category === 'strength' || exercise.category === 'powerlifting') &&
    STRENGTH_PATTERNS.has(exercise.pattern)
  )
}

/**
 * Nivel admisible: 0 = del nivel del usuario o inferior; 1 = un nivel por encima (solo si no hay
 * otra opción); `null` = no admisible.
 */
export function levelTier(exercise: Exercise, level: Level): 0 | 1 | null {
  const gap = LEVEL_RANK[exercise.level] - LEVEL_RANK[level]
  if (gap <= 0) return 0
  if (gap === 1) return 1
  return null
}

const VARIANT_TEST: Record<Variant, (e: Exercise) => boolean> = {
  incline: (e) => e.id.includes('incline'),
  machine: (e) => e.equipment.includes('machine'),
  unilateral: (e) => e.unilateral,
  hammer: (e) => e.id.includes('hammer'),
  overhead: (e) => /overhead|standing-dumbbell-triceps/.test(e.id),
  romanian: (e) => /romanian|stiff-legged/.test(e.id),
}

const FREE_WEIGHTS: Equipment[] = ['barbell', 'ezBar', 'dumbbell', 'kettlebell']

export interface ScoreInput {
  exercise: Exercise
  role: SlotRole
  prefer?: Variant
  ctx: SelectionContext
  /** Veces que el ejercicio ya aparece en la semana (variedad entre días). */
  usedInWeek: number
}

export function scoreExercise({ exercise: e, role, prefer, ctx, usedInWeek }: ScoreInput) {
  let score = e.staple * 10
  const isMain = role === 'main'
  const barbell = e.equipment.includes('barbell')
  const machine = e.equipment.includes('machine') || e.equipment.includes('cable')
  const free = e.equipment.some((item) => FREE_WEIGHTS.includes(item))
  const loadable = isLoadable(e)

  // Encaje con el objetivo: en fuerza, los principales con carga externa (mejor con barra).
  if (ctx.goal === 'strength' && isMain) score += !loadable ? -6 : barbell ? 6 : free ? 2 : -2
  if (ctx.goal === 'hypertrophy' && !isMain && machine) score += 2
  // Fuera de fuerza, un principal sin carga externa progresa peor (salvo para quien empieza).
  if (ctx.goal !== 'strength' && isMain && !loadable) score -= ctx.level === 'beginner' ? 2 : 5
  if ((ctx.goal === 'health' || ctx.goal === 'fatLoss' || ctx.goal === 'endurance') && !barbell)
    score += 2

  // Encaje con el nivel: el principiante aprende antes con máquinas y mancuernas.
  if (ctx.level === 'beginner') {
    if (machine || e.equipment.includes('dumbbell')) score += 4
    if (barbell && isMain) score -= 3
  }
  if (e.level === ctx.level) score += 2
  else if (LEVEL_RANK[e.level] < LEVEL_RANK[ctx.level]) score += 1

  // Los unilaterales duplican el tiempo: mejor como accesorio que como principal.
  if (e.unilateral && isMain) score -= 3

  if (prefer && VARIANT_TEST[prefer](e)) score += 6

  // Con molestias, preferir la opción que menos carga la zona aunque esté permitida.
  for (const injury of ctx.injuries) {
    const stress = e.jointStress[injury.zone]
    if (stress === 'low' && injury.severity !== 'mild')
      score -= injury.severity === 'severe' ? 5 : 2
    if (stress === 'moderate') score -= 3
    if (stress === 'high') score -= 6
  }

  // Variedad entre días.
  score -= usedInWeek * 8
  return score
}

export interface Candidate {
  exercise: Exercise
  score: number
  tier: 0 | 1
}

/** Candidatos válidos para un patrón, ordenados de mejor a peor. */
export function candidatesFor(
  pattern: Pattern,
  slot: Pick<SlotDef, 'role' | 'prefer'>,
  catalog: readonly Exercise[],
  ctx: SelectionContext,
  usage: ReadonlyMap<string, number>,
  exclude: ReadonlySet<string>,
): Candidate[] {
  const list: Candidate[] = []
  for (const exercise of catalog) {
    if (exercise.pattern !== pattern || exclude.has(exercise.id)) continue
    if (!isProgrammable(exercise) || !isSafeAndAvailable(exercise, ctx)) continue
    const tier = levelTier(exercise, ctx.level)
    if (tier === null) continue
    const score = scoreExercise({
      exercise,
      role: slot.role,
      prefer: slot.prefer,
      ctx,
      usedInWeek: usage.get(exercise.id) ?? 0,
    })
    list.push({ exercise, score, tier })
  }
  return list.sort(
    (a, b) => a.tier - b.tier || b.score - a.score || a.exercise.id.localeCompare(b.exercise.id),
  )
}

/**
 * Alternativas para sustituir en la sesión: las precalculadas en el catálogo primero y luego
 * otras del mismo patrón, siempre válidas para el material, las lesiones y el nivel.
 */
export function alternativesFor(
  exercise: Exercise,
  byId: ReadonlyMap<string, Exercise>,
  catalog: readonly Exercise[],
  ctx: SelectionContext,
  limit = 6,
) {
  const valid = (e: Exercise | undefined): e is Exercise =>
    !!e &&
    e.id !== exercise.id &&
    STRENGTH_PATTERNS.has(e.pattern) &&
    e.category !== 'stretching' &&
    levelTier(e, ctx.level) !== null &&
    isSafeAndAvailable(e, ctx)
  const result: string[] = []
  for (const id of exercise.alternatives) {
    const alt = byId.get(id)
    if (valid(alt)) result.push(alt.id)
  }
  if (result.length < limit) {
    const extra = candidatesFor(
      exercise.pattern,
      { role: 'accessory' },
      catalog,
      ctx,
      new Map(),
      new Set([exercise.id, ...result]),
    )
    for (const c of extra) {
      if (result.length >= limit) break
      result.push(c.exercise.id)
    }
  }
  return result.slice(0, limit)
}
