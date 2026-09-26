import { z } from 'zod'

import { INJURY_ZONES } from './injuries'

/**
 * Esfuerzo percibido de una serie con tres chips: se traduce a repeticiones en reserva (RIR).
 * Es más fácil de usar en el gimnasio que pedir un número exacto.
 */
export const EFFORTS = ['easy', 'solid', 'limit'] as const
export type Effort = (typeof EFFORTS)[number]

export const EFFORT_RIR: Record<Effort, number> = { easy: 4, solid: 2, limit: 0 }

export function rirToEffort(rir: number): Effort {
  if (rir >= 3.5) return 'easy'
  if (rir >= 1) return 'solid'
  return 'limit'
}

export const LoggedSetSchema = z.object({
  exerciseId: z.string(),
  /** Carga externa en kg; `null` en ejercicios con peso corporal o bandas. */
  kg: z.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(200),
  /** Repeticiones en reserva estimadas; `null` si no se indicó. */
  rir: z.number().min(0).max(10).nullable(),
  /** Marca de tiempo (ms) al completar la serie. */
  at: z.number().int(),
  warmup: z.boolean().optional(),
})

export type LoggedSet = z.infer<typeof LoggedSetSchema>

export const SessionLogSchema = z.object({
  id: z.string(),
  /** Día del plan que se entrenó (p. ej. `fbA`). */
  dayId: z.string(),
  planId: z.string(),
  /** Fecha local `YYYY-MM-DD` en la que empezó la sesión. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: z.number().int(),
  endedAt: z.number().int().nullable(),
  sets: z.array(LoggedSetSchema),
  /** Esfuerzo global de la sesión (RPE 1-10). */
  rpe: z.number().min(1).max(10).nullable(),
  notes: z.string().max(2000).optional(),
})

export type SessionLog = z.infer<typeof SessionLogSchema>

/** Check-in semanal opcional. Las molestias puntuales se tratan como lesión leve temporal. */
export const CheckInSchema = z.object({
  /** Lunes de la semana a la que se refiere, `YYYY-MM-DD`. */
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  energy: z.number().int().min(1).max(5),
  sleep: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
  pain: z.array(z.enum(INJURY_ZONES)),
})

export type CheckIn = z.infer<typeof CheckInSchema>
