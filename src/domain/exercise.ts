import { z } from 'zod'

import { EQUIPMENT } from './equipment'
import { INJURY_ZONES, STRESS_LEVELS } from './injuries'
import { LEVELS } from './levels'
import { MUSCLES } from './muscles'
import { PATTERNS } from './patterns'

export const CATEGORIES = [
  'strength',
  'powerlifting',
  'olympic',
  'strongman',
  'plyometrics',
  'cardio',
  'stretching',
] as const
export type Category = (typeof CATEGORIES)[number]

export const MuscleSchema = z.enum(MUSCLES)
export const EquipmentSchema = z.enum(EQUIPMENT)
export const PatternSchema = z.enum(PATTERNS)
export const LevelSchema = z.enum(LEVELS)
export const InjuryZoneSchema = z.enum(INJURY_ZONES)
export const StressLevelSchema = z.enum(STRESS_LEVELS)

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id en kebab-case')

/** Datos estructurales de un ejercicio, independientes del idioma. */
export const ExerciseSchema = z
  .object({
    id: slug,
    sourceId: z.string().min(1),
    category: z.enum(CATEGORIES),
    level: LevelSchema,
    mechanic: z.enum(['compound', 'isolation']).nullable(),
    force: z.enum(['push', 'pull', 'static']).nullable(),
    pattern: PatternSchema,
    equipment: z.array(EquipmentSchema).min(1),
    primaryMuscles: z.array(MuscleSchema).min(1),
    secondaryMuscles: z.array(MuscleSchema),
    jointStress: z.partialRecord(InjuryZoneSchema, StressLevelSchema),
    unilateral: z.boolean(),
    /** Preferencia curada para el motor: 3 = básico imprescindible, 0 = no se programa por defecto. */
    staple: z.number().int().min(0).max(3),
    images: z.array(z.string().regex(/^[a-z0-9-]+\/\d\.webp$/)).min(1),
    alternatives: z.array(slug),
  })
  .refine((e) => !e.primaryMuscles.some((m) => e.secondaryMuscles.includes(m)), {
    message: 'Un músculo no puede ser principal y secundario a la vez',
  })

export type Exercise = z.infer<typeof ExerciseSchema>

/** Contenido traducible de un ejercicio. */
export const ExerciseContentSchema = z.object({
  name: z.string().min(2),
  steps: z.array(z.string().min(3)).min(1),
  tips: z.array(z.string().min(3)).optional(),
  mistakes: z.array(z.string().min(3)).optional(),
})

export type ExerciseContent = z.infer<typeof ExerciseContentSchema>

export const ExerciseCatalogSchema = z.object({
  version: z.string(),
  source: z.object({ name: z.string(), url: z.url(), commit: z.string(), license: z.string() }),
  exercises: z.array(ExerciseSchema),
})

export type ExerciseCatalog = z.infer<typeof ExerciseCatalogSchema>

export const ExerciseLocaleSchema = z.record(z.string(), ExerciseContentSchema)
export type ExerciseLocale = z.infer<typeof ExerciseLocaleSchema>
