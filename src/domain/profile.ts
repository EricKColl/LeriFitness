import { z } from 'zod'

import { USER_EQUIPMENT } from './equipment'
import { INJURY_SEVERITIES, INJURY_ZONES } from './injuries'
import { LEVELS } from './levels'

export const GOALS = ['strength', 'hypertrophy', 'fatLoss', 'health', 'endurance'] as const
export type Goal = (typeof GOALS)[number]

/** Actividad en el trabajo: ajusta volumen, énfasis y gasto energético. */
export const JOB_TYPES = ['sedentary', 'active', 'physical'] as const
export type JobType = (typeof JOB_TYPES)[number]

/** Sexo biológico: solo se usa para estimar el gasto energético (Mifflin-St Jeor). */
export const SEXES = ['female', 'male'] as const
export type Sex = (typeof SEXES)[number]

/** Días de la semana, de lunes (0) a domingo (6). */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const
export type Weekday = (typeof WEEKDAYS)[number]

export const MIN_TRAINING_DAYS = 1
/** Máximo de días: el descanso también construye. */
export const MAX_TRAINING_DAYS = 6
export const MIN_SESSION_MINUTES = 20
export const MAX_SESSION_MINUTES = 120

export const InjurySchema = z.object({
  zone: z.enum(INJURY_ZONES),
  severity: z.enum(INJURY_SEVERITIES),
})

export const ProfileSchema = z.object({
  sex: z.enum(SEXES),
  age: z.number().int().min(14).max(100),
  heightCm: z.number().min(120).max(230),
  weightKg: z.number().min(30).max(300),
  job: z.enum(JOB_TYPES),
  /** Días concretos de entrenamiento; su número es la frecuencia semanal. */
  weekdays: z
    .array(z.literal(WEEKDAYS))
    .min(MIN_TRAINING_DAYS)
    .max(MAX_TRAINING_DAYS)
    .refine((days) => new Set(days).size === days.length, 'Días repetidos'),
  minutesPerSession: z.number().int().min(MIN_SESSION_MINUTES).max(MAX_SESSION_MINUTES),
  equipment: z.array(z.enum(USER_EQUIPMENT)),
  level: z.enum(LEVELS),
  /** Solo se rellena con consentimiento explícito (datos de salud, RGPD art. 9). */
  injuries: z.array(InjurySchema),
  goal: z.enum(GOALS),
})

export type Profile = z.infer<typeof ProfileSchema>

/** Reparto por defecto de los días de entrenamiento, lo más espaciados posible. */
export const DEFAULT_WEEKDAYS: Record<number, Weekday[]> = {
  1: [2],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
}
